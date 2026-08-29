#include "blokmotor/vm.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
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
    lists_.clear();
    broadcasts_.clear();
    lastSound_.clear();
    timer_ = 0;
    for (auto& script : scripts_) {
        script.waitLeft = 0;
        script.startDone = false;
        script.pc = 0;
    }
}

Json BlockVM::varsJson() const {
    Json root = Json::object();
    Json vars = Json::object();
    for (const auto& kv : vars_) vars[kv.first] = kv.second;
    root["vars"] = vars;
    Json lists = Json::object();
    for (const auto& kv : lists_) {
        Json arr = Json::array();
        for (double v : kv.second) arr.push(v);
        lists[kv.first] = arr;
    }
    root["lists"] = lists;
    root["timer"] = timer_;
    root["lastSound"] = lastSound_;
    return root;
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
    if (op == "visible") return Value::booleanValue(ctx.self && ctx.self->visible);
    if (op == "timer") return Value::num(timer_);
    if (op == "random") {
        const double a = argf(block, "a", 1);
        const double b = argf(block, "b", 10);
        const double lo = std::min(a, b);
        const double hi = std::max(a, b);
        const double t = static_cast<double>(std::rand()) / static_cast<double>(RAND_MAX);
        return Value::num(lo + t * (hi - lo));
    }
    if (op == "touching") {
        if (!ctx.self || !ctx.scene) return Value::booleanValue(false);
        const std::string name = arg(block, "name");
        for (auto& other : ctx.scene->objects) {
            if (other.id == ctx.self->id) continue;
            if (!name.empty() && other.name != name && other.id != name) continue;
            const Vec3 d = other.transform.position - ctx.self->transform.position;
            const Vec3 a = ctx.self->halfExtents();
            const Vec3 b = other.halfExtents();
            if (std::fabs(d.x) < a.x + b.x && std::fabs(d.y) < a.y + b.y && std::fabs(d.z) < a.z + b.z) {
                return Value::booleanValue(true);
            }
        }
        return Value::booleanValue(false);
    }
    if (op == "distance_to") {
        if (!ctx.self || !ctx.scene) return Value::num(0);
        GameObject* other = ctx.scene->find(arg(block, "name"));
        if (!other) other = ctx.scene->findByName(arg(block, "name"));
        if (!other) return Value::num(0);
        return Value::num((other->transform.position - ctx.self->transform.position).length());
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
        if (m == "mod") return Value::num(b == 0 ? 0 : std::fmod(a, b));
        if (m == "min") return Value::num(std::min(a, b));
        if (m == "max") return Value::num(std::max(a, b));
        return Value::num(a + b);
    }
    if (op == "unary") {
        const double a = argf(block, "a");
        const std::string m = arg(block, "fn", "abs");
        if (m == "sqrt") return Value::num(a < 0 ? 0 : std::sqrt(a));
        if (m == "round") return Value::num(std::round(a));
        if (m == "floor") return Value::num(std::floor(a));
        if (m == "sin") return Value::num(std::sin(radians(static_cast<float>(a))));
        if (m == "cos") return Value::num(std::cos(radians(static_cast<float>(a))));
        return Value::num(std::fabs(a));
    }
    if (op == "and" || op == "or" || op == "not") {
        bool a = arg(block, "a", "true") != "false";
        bool b = arg(block, "b", "true") != "false";
        if (block.condition) a = eval(ctx, *block.condition).asBool();
        if (op == "not") return Value::booleanValue(!a);
        if (op == "and") return Value::booleanValue(a && b);
        return Value::booleanValue(a || b);
    }
    if (op == "list_len") return Value::num(static_cast<double>(lists_[arg(block, "name", "liste")].size()));
    if (op == "list_item") {
        const auto& list = lists_[arg(block, "name", "liste")];
        int i = static_cast<int>(argf(block, "index", 1)) - 1;
        if (i < 0 || i >= static_cast<int>(list.size())) return Value::num(0);
        return Value::num(list[static_cast<size_t>(i)]);
    }
    return Value::booleanValue(false);
}

void BlockVM::runBlock(Context& ctx, const Block& block) {
    if (--ctx.budget <= 0) return;
    const std::string op = lower(block.op);
    GameObject* obj = resolve(ctx, block);
    const bool noTargetOk = op == "if" || op == "if_else" || op == "repeat" || op == "forever" || op == "wait" ||
                            op == "set_var" || op == "change_var" || op == "broadcast" || op == "set_backdrop" ||
                            op == "next_backdrop" || op == "set_gravity" || op == "set_fov" || op == "set_volume" ||
                            op == "play_sound" || op == "play_note" || op == "reset_timer" || op == "list_add" ||
                            op == "list_clear";
    if (!obj && noTargetOk) {
    } else if (!obj) {
        return;
    }

    if (op == "set_position" || op == "glide") {
        obj->transform.position = {argf(block, "x", obj->transform.position.x),
                                   argf(block, "y", obj->transform.position.y),
                                   argf(block, "z", obj->transform.position.z)};
    } else if (op == "change_position" || op == "move") {
        obj->transform.position += {argf(block, "x") * (arg(block, "rate") == "frame" ? 1 : 1),
                                    argf(block, "y"), argf(block, "z")};
    } else if (op == "set_x") {
        obj->transform.position.x = argf(block, "value");
    } else if (op == "set_y") {
        obj->transform.position.y = argf(block, "value");
    } else if (op == "set_z") {
        obj->transform.position.z = argf(block, "value");
    } else if (op == "change_x") {
        obj->transform.position.x += argf(block, "value", 0.1f);
    } else if (op == "change_y") {
        obj->transform.position.y += argf(block, "value", 0.1f);
    } else if (op == "change_z") {
        obj->transform.position.z += argf(block, "value", 0.1f);
    } else if (op == "set_rotation") {
        obj->transform.rotation = {argf(block, "x", obj->transform.rotation.x),
                                   argf(block, "y", obj->transform.rotation.y),
                                   argf(block, "z", obj->transform.rotation.z)};
    } else if (op == "rotate" || op == "turn") {
        const std::string axis = lower(arg(block, "axis", "y"));
        const float deg = argf(block, "degrees", 90) * ctx.dt;
        if (axis == "x") obj->transform.rotation.x += deg;
        else if (axis == "z") obj->transform.rotation.z += deg;
        else obj->transform.rotation.y += deg;
    } else if (op == "point_towards" || op == "look_at") {
        GameObject* other = ctx.scene ? ctx.scene->findByName(arg(block, "name")) : nullptr;
        if (!other && ctx.scene) other = ctx.scene->find(arg(block, "name"));
        if (other) {
            const Vec3 d = other->transform.position - obj->transform.position;
            obj->transform.rotation.y = degrees(std::atan2(d.x, d.z));
        }
    } else if (op == "go_to") {
        GameObject* other = ctx.scene ? ctx.scene->findByName(arg(block, "name")) : nullptr;
        if (!other && ctx.scene) other = ctx.scene->find(arg(block, "name"));
        if (other) obj->transform.position = other->transform.position;
    } else if (op == "bounce_edge") {
        if (std::fabs(obj->transform.position.x) > 6) obj->velocity.x *= -1;
        if (std::fabs(obj->transform.position.z) > 6) obj->velocity.z *= -1;
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
    } else if (op == "apply_force") {
        obj->velocity += {argf(block, "x"), argf(block, "y"), argf(block, "z")};
    } else if (op == "set_color") {
        obj->color = Color::fromHex(arg(block, "color", "#ffffff"));
    } else if (op == "set_scale") {
        const float s = argf(block, "value", 1);
        obj->transform.scale = {s, s, s};
    } else if (op == "set_size") {
        obj->size = argf(block, "value", 100);
    } else if (op == "change_size") {
        obj->size += argf(block, "value", 10);
    } else if (op == "set_opacity" || op == "set_ghost") {
        obj->opacity = clampf(argf(block, "value", 100) / 100.0f, 0, 1);
    } else if (op == "set_visible") {
        obj->visible = arg(block, "value", "true") != "false";
    } else if (op == "show") {
        obj->visible = true;
    } else if (op == "hide") {
        obj->visible = false;
    } else if (op == "say" || op == "think") {
        obj->sayText = arg(block, "text", "Merhaba!");
        obj->sayTime = argf(block, "seconds", 2);
    } else if (op == "next_costume") {
        obj->nextCostume();
    } else if (op == "set_costume") {
        obj->setCostume(static_cast<int>(argf(block, "index", 1)) - 1);
    } else if (op == "start_anim") {
        obj->animating = true;
        obj->animFps = argf(block, "fps", 6);
    } else if (op == "stop_anim") {
        obj->animating = false;
    } else if (op == "set_backdrop") {
        if (ctx.scene) ctx.scene->applyBackdrop(arg(block, "name", "cayir"));
    } else if (op == "next_backdrop") {
        if (ctx.scene) {
            static const char* backs[] = {"cayir", "gece", "gunbatimi", "uzay", "deniz", "col", "kar", "sehir",
                                          "orman", "magara", "kale", "sahne", "sualti", "volkan", "bulutlar", "ay"};
            int idx = 0;
            for (int i = 0; i < 16; ++i) {
                if (ctx.scene->backdropId == backs[i]) idx = (i + 1) % 16;
            }
            ctx.scene->applyBackdrop(backs[idx]);
        }
    } else if (op == "set_layer") {
        obj->layer = static_cast<int>(argf(block, "value"));
    } else if (op == "play_sound" || op == "play_note") {
        lastSound_ = arg(block, "name", arg(block, "note", "C4"));
        if (ctx.scene) ctx.scene->lastSound = lastSound_;
    } else if (op == "set_volume") {
        if (ctx.scene) ctx.scene->volume = argf(block, "value", 80);
    } else if (op == "set_gravity") {
        if (ctx.scene) ctx.scene->gravity = argf(block, "value", -20);
    } else if (op == "set_fov") {
        if (ctx.scene) ctx.scene->camera.fov = argf(block, "value", 50);
    } else if (op == "camera_look") {
        if (ctx.scene) ctx.scene->camera.target = obj->transform.position;
    } else if (op == "broadcast") {
        const std::string msg = arg(block, "name", "merhaba");
        broadcasts_.insert(msg);
        if (ctx.scene) {
            ctx.scene->lastBroadcast = msg;
            ctx.scene->pendingBroadcasts.push_back(msg);
        }
    } else if (op == "create_clone") {
        if (ctx.scene) ctx.scene->pendingClones.push_back(obj->id);
    } else if (op == "delete_clone") {
        if (obj->isClone && ctx.scene) ctx.scene->remove(obj->id);
    } else if (op == "pen_down") {
        obj->penDown = true;
    } else if (op == "pen_up") {
        obj->penDown = false;
    } else if (op == "set_pen") {
        obj->penColor = Color::fromHex(arg(block, "color", "#2244ee"));
        obj->penSize = argf(block, "size", 3);
    } else if (op == "set_var") {
        vars_[arg(block, "name", "skor")] = argf(block, "value");
    } else if (op == "change_var") {
        vars_[arg(block, "name", "skor")] += argf(block, "value", 1);
    } else if (op == "list_add") {
        lists_[arg(block, "name", "liste")].push_back(argf(block, "value"));
    } else if (op == "list_clear") {
        lists_[arg(block, "name", "liste")].clear();
    } else if (op == "reset_timer") {
        timer_ = 0;
    } else if (op == "wait") {
        // handled at script level
    } else if (op == "repeat" || op == "forever") {
        const int times = op == "forever" ? 1 : std::max(0, std::min(64, static_cast<int>(argf(block, "times", 1))));
        for (int i = 0; i < times && ctx.budget > 0; ++i) runStack(ctx, block.stack.empty() ? block.thenBranch : block.stack);
    } else if (op == "if" || op == "if_else") {
        bool ok = false;
        if (block.condition) ok = eval(ctx, *block.condition).asBool();
        else if (block.args.count("key")) ok = ctx.keys && ctx.keys->count(arg(block, "key"));
        else if (block.args.count("condOp")) {
            Block cond;
            cond.op = arg(block, "condOp");
            cond.args = block.args;
            ok = eval(ctx, cond).asBool();
        } else {
            ok = eval(ctx, block).asBool();
        }
        runStack(ctx, ok ? block.thenBranch : block.elseBranch);
    }
}

void BlockVM::tick(Scene& scene, float dt, const std::unordered_set<std::string>& keys) {
    timer_ += dt;
    scene.timer = timer_;
    const auto currentBroadcasts = broadcasts_;
    broadcasts_.clear();
    for (auto& object : scene.objects) {
        if (object.sayTime > 0) {
            object.sayTime -= dt;
            if (object.sayTime <= 0) object.sayText.clear();
        }
        if (object.animating && !object.costumes.empty()) {
            object.animTimer += dt * object.animFps;
            while (object.animTimer >= 1.0f) {
                object.animTimer -= 1.0f;
                object.nextCostume();
            }
        }
    }
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
        } else if (hat == "when_broadcast" || hat == "mesaj_gelince") {
            run = currentBroadcasts.count(arg(script.hat, "name", "merhaba")) > 0;
        } else if (hat == "when_backdrop" || hat == "dekor_degisince") {
            run = scene.backdropId == arg(script.hat, "name", scene.backdropId);
        } else if (hat == "when_clone" || hat == "kopya_olunca") {
            run = self->isClone && !script.startDone;
            if (run) script.startDone = true;
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
