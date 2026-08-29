#include "blokmotor/vm.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <utility>

namespace blok {
namespace {

std::string lower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return s;
}

std::unordered_map<std::string, std::string> argsFromJson(const Json& json) {
    std::unordered_map<std::string, std::string> args;
    if (!json.isObject()) return args;
    for (const auto& kv : json.objectItems()) {
        if (kv.second.isString()) args[kv.first] = kv.second.asString();
        else if (kv.second.isNumber()) args[kv.first] = std::to_string(kv.second.asNumber());
        else if (kv.second.isBool()) args[kv.first] = kv.second.asBool() ? "true" : "false";
    }
    return args;
}

Json argsToJson(const std::unordered_map<std::string, std::string>& args) {
    Json j = Json::object();
    for (const auto& kv : args) j[kv.first] = kv.second;
    return j;
}

Json stackToJson(const std::vector<Block>& stack) {
    Json arr = Json::array();
    for (const auto& block : stack) arr.push(block.toJson());
    return arr;
}

std::vector<Block> stackFromJson(const Json& json) {
    std::vector<Block> stack;
    if (!json.isArray()) return stack;
    for (const auto& item : json.arrayItems()) stack.push_back(Block::fromJson(item));
    return stack;
}

}  // namespace

Block::Block(const Block& other)
    : op(other.op),
      args(other.args),
      stack(other.stack),
      thenBranch(other.thenBranch),
      elseBranch(other.elseBranch),
      condition(other.condition ? new Block(*other.condition) : nullptr) {}

Block& Block::operator=(const Block& other) {
    if (this == &other) return *this;
    Block tmp(other);
    *this = std::move(tmp);
    return *this;
}

Block::Block(Block&& other) noexcept
    : op(std::move(other.op)),
      args(std::move(other.args)),
      stack(std::move(other.stack)),
      thenBranch(std::move(other.thenBranch)),
      elseBranch(std::move(other.elseBranch)),
      condition(other.condition) {
    other.condition = nullptr;
}

Block& Block::operator=(Block&& other) noexcept {
    if (this == &other) return *this;
    delete condition;
    op = std::move(other.op);
    args = std::move(other.args);
    stack = std::move(other.stack);
    thenBranch = std::move(other.thenBranch);
    elseBranch = std::move(other.elseBranch);
    condition = other.condition;
    other.condition = nullptr;
    return *this;
}

Block::~Block() { delete condition; }

Block Block::fromJson(const Json& json) {
    Block block;
    block.op = json["op"].asString();
    if (block.op.empty()) block.op = json["type"].asString();
    block.args = argsFromJson(json["args"]);
    if (json.has("stack")) block.stack = stackFromJson(json["stack"]);
    if (json.has("then")) block.thenBranch = stackFromJson(json["then"]);
    if (json.has("else")) block.elseBranch = stackFromJson(json["else"]);
    if (json.has("cond") && json["cond"].isObject()) {
        block.condition = new Block(Block::fromJson(json["cond"]));
    }
    return block;
}

Json Block::toJson() const {
    Json j = Json::object();
    j["op"] = op;
    j["args"] = argsToJson(args);
    if (!stack.empty()) j["stack"] = stackToJson(stack);
    if (!thenBranch.empty()) j["then"] = stackToJson(thenBranch);
    if (!elseBranch.empty()) j["else"] = stackToJson(elseBranch);
    if (condition) j["cond"] = condition->toJson();
    return j;
}

Script Script::fromJson(const Json& json) {
    Script script;
    script.target = json["target"].asString();
    if (json["hat"].isObject()) {
        script.hat = Block::fromJson(json["hat"]);
    } else {
        script.hat.op = json["hat"].asString("every_frame");
        script.hat.args = argsFromJson(json["hatArgs"]);
    }
    script.stack = stackFromJson(json["stack"]);
    return script;
}

Json Script::toJson() const {
    Json j = Json::object();
    j["target"] = target;
    j["hat"] = hat.toJson();
    j["stack"] = stackToJson(stack);
    return j;
}

void BlockVM::load(const Json& json) {
    scripts_.clear();
    vars_.clear();
    const Json& list = json.isArray() ? json : json["scripts"];
    if (!list.isArray()) return;
    for (const auto& item : list.arrayItems()) {
        scripts_.push_back(Script::fromJson(item));
    }
}

Json BlockVM::save() const {
    Json root = Json::object();
    Json list = Json::array();
    for (const auto& script : scripts_) list.push(script.toJson());
    root["scripts"] = list;
    return root;
}

void BlockVM::resetRuntime() {
    vars_.clear();
    for (auto& script : scripts_) {
        script.waitLeft = 0;
        script.startDone = false;
        script.pc = 0;
    }
}

std::string BlockVM::arg(const Block& block, const std::string& key, const std::string& fallback) {
    auto it = block.args.find(key);
    return it == block.args.end() ? fallback : it->second;
}

float BlockVM::argf(const Block& block, const std::string& key, float fallback) {
    auto it = block.args.find(key);
    if (it == block.args.end() || it->second.empty()) return fallback;
    try {
        return std::stof(it->second);
    } catch (...) {
        return fallback;
    }
}

GameObject* BlockVM::resolve(Context& ctx, const Block& block) {
    const std::string target = arg(block, "target");
    if (!target.empty() && ctx.scene) {
        if (auto* found = ctx.scene->find(target)) return found;
        if (auto* found = ctx.scene->findByName(target)) return found;
    }
    return ctx.self;
}

void BlockVM::runStack(Context& ctx, const std::vector<Block>& stack) {
    for (const auto& block : stack) {
        if (ctx.budget <= 0 || ctx.yielded) return;
        runBlock(ctx, block);
    }
}

BlockVM::Value BlockVM::eval(Context& ctx, const Block& block) {
    const std::string op = lower(block.op);
    if (op == "number") return Value::num(argf(block, "value"));
    if (op == "get_var") {
        const auto it = vars_.find(arg(block, "name"));
        return Value::num(it == vars_.end() ? 0 : it->second);
    }
    if (op == "key_down" || op == "key_pressed") {
        const std::string key = arg(block, "key", "Space");
        const bool down = ctx.keys && ctx.keys->count(key);
        return Value::booleanValue(down);
    }
    if (op == "grounded" || op == "on_ground") {
        return Value::booleanValue(ctx.self && ctx.self->grounded);
    }
    if (op == "compare") {
        const double a = argf(block, "a");
        const double b = argf(block, "b");
        const std::string cmp = arg(block, "cmp", ">");
        bool ok = false;
        if (cmp == ">") ok = a > b;
        else if (cmp == "<") ok = a < b;
        else if (cmp == ">=") ok = a >= b;
        else if (cmp == "<=") ok = a <= b;
        else if (cmp == "=" || cmp == "==") ok = std::fabs(a - b) < 1e-5;
        else ok = a != b;
        return Value::booleanValue(ok);
    }
    if (op == "math") {
        const double a = argf(block, "a");
        const double b = argf(block, "b");
        const std::string m = arg(block, "fn", "+");
        if (m == "-") return Value::num(a - b);
        if (m == "*") return Value::num(a * b);
        if (m == "/") return Value::num(b == 0 ? 0 : a / b);
        return Value::num(a + b);
    }
    return Value::booleanValue(false);
}

void BlockVM::runBlock(Context& ctx, const Block& block) {
    if (--ctx.budget <= 0) return;
    const std::string op = lower(block.op);
    GameObject* obj = resolve(ctx, block);
    if (!obj && (op == "if" || op == "repeat" || op == "wait" || op == "set_var" || op == "change_var")) {
        // control / vars still run without a target
    } else if (!obj) {
        return;
    }

    if (op == "set_position") {
        obj->transform.position = {argf(block, "x", obj->transform.position.x),
                                   argf(block, "y", obj->transform.position.y),
                                   argf(block, "z", obj->transform.position.z)};
    } else if (op == "change_position" || op == "move") {
        obj->transform.position += {argf(block, "x"), argf(block, "y"), argf(block, "z")};
    } else if (op == "set_rotation") {
        obj->transform.rotation = {argf(block, "x", obj->transform.rotation.x),
                                   argf(block, "y", obj->transform.rotation.y),
                                   argf(block, "z", obj->transform.rotation.z)};
    } else if (op == "rotate") {
        const std::string axis = lower(arg(block, "axis", "y"));
        const float deg = argf(block, "degrees", 90) * ctx.dt;
        if (axis == "x") obj->transform.rotation.x += deg;
        else if (axis == "z") obj->transform.rotation.z += deg;
        else obj->transform.rotation.y += deg;
    } else if (op == "set_velocity") {
        obj->velocity = {argf(block, "x", obj->velocity.x), argf(block, "y", obj->velocity.y),
                         argf(block, "z", obj->velocity.z)};
    } else if (op == "move_forward") {
        const float amount = argf(block, "amount", 2) * ctx.dt;
        const float yaw = radians(obj->transform.rotation.y);
        obj->transform.position.x += std::sin(yaw) * amount;
        obj->transform.position.z += std::cos(yaw) * amount;
    } else if (op == "jump") {
        if (obj->grounded || arg(block, "always") == "true") {
            obj->velocity.y = argf(block, "force", 8);
            obj->grounded = false;
        }
    } else if (op == "set_color") {
        obj->color = Color::fromHex(arg(block, "color", "#ffffff"));
    } else if (op == "set_scale") {
        const float s = argf(block, "value", 1);
        obj->transform.scale = {s, s, s};
    } else if (op == "set_visible") {
        obj->visible = arg(block, "value", "true") != "false";
    } else if (op == "set_var") {
        vars_[arg(block, "name", "skor")] = argf(block, "value");
    } else if (op == "change_var") {
        vars_[arg(block, "name", "skor")] += argf(block, "value", 1);
    } else if (op == "wait") {
        // handled at script level; ignore inside nested stacks
    } else if (op == "repeat") {
        const int times = std::max(0, std::min(64, static_cast<int>(argf(block, "times", 1))));
        for (int i = 0; i < times && ctx.budget > 0; ++i) runStack(ctx, block.stack.empty() ? block.thenBranch : block.stack);
    } else if (op == "if") {
        bool ok = false;
        if (block.condition) ok = eval(ctx, *block.condition).asBool();
        else if (block.args.count("key")) ok = ctx.keys && ctx.keys->count(arg(block, "key"));
        else ok = eval(ctx, block).asBool();
        runStack(ctx, ok ? block.thenBranch : block.elseBranch);
    }
}

void BlockVM::tick(Scene& scene, float dt, const std::unordered_set<std::string>& keys) {
    for (auto& script : scripts_) {
        GameObject* self = scene.find(script.target);
        if (!self) self = scene.findByName(script.target);
        if (!self) continue;

        Context ctx;
        ctx.scene = &scene;
        ctx.self = self;
        ctx.dt = dt;
        ctx.keys = &keys;
        ctx.budget = 256;

        const std::string hat = lower(script.hat.op);
        bool run = false;
        if (hat == "when_start" || hat == "oyun_baslayinca") {
            if (!script.startDone) {
                run = true;
                script.startDone = true;
            }
        } else if (hat == "every_frame" || hat == "her_kare") {
            run = true;
        } else if (hat == "when_key" || hat == "tusa_basilinca") {
            run = keys.count(arg(script.hat, "key", "Space")) > 0;
        }

        if (!run) continue;
        if (script.waitLeft > 0) {
            script.waitLeft -= dt;
            continue;
        }

        for (const auto& block : script.stack) {
            if (ctx.budget <= 0) break;
            if (lower(block.op) == "wait") {
                script.waitLeft = argf(block, "seconds", 1);
                break;
            }
            runBlock(ctx, block);
        }
    }
}

}  // namespace blok
