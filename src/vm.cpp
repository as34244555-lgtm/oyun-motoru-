#include "blokmotor/vm.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdio>
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
    if (op == "x_position") return Value::num(ctx.self ? ctx.self->transform.position.x : 0);
    if (op == "y_position") return Value::num(ctx.self ? ctx.self->transform.position.y : 0);
    if (op == "z_position") return Value::num(ctx.self ? ctx.self->transform.position.z : 0);
    if (op == "heading") return Value::num(ctx.self ? ctx.self->transform.rotation.y : 0);
    if (op == "costume_number") return Value::num(ctx.self ? ctx.self->costumeIndex + 1 : 1);
    if (op == "size_of") return Value::num(ctx.self ? ctx.self->size : 100);
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
    if (op == "var_gt") {
        const auto it = vars_.find(arg(block, "name", "skor"));
        return Value::booleanValue(it != vars_.end() && it->second > argf(block, "value"));
    }
    if (op == "timer_gt") return Value::booleanValue(timer_ > argf(block, "seconds", argf(block, "value", 1)));
    if (op == "random_chance") {
        const double t = static_cast<double>(std::rand()) / static_cast<double>(RAND_MAX);
        return Value::booleanValue(t * 100.0 < argf(block, "value", 50));
    }
    if (op == "edge") {
        if (!ctx.self) return Value::booleanValue(false);
        return Value::booleanValue(std::fabs(ctx.self->transform.position.x) > 6 ||
                                   std::fabs(ctx.self->transform.position.z) > 6);
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
                            op == "list_clear" || op == "set_camera_orbit" || op == "set_camera_yaw" ||
                            op == "set_camera_pitch" || op == "change_camera_yaw" || op == "change_camera_pitch" ||
                            op == "set_camera_distance" || op == "camera_follow" || op == "camera_unfollow" ||
                            op == "camera_preset" || op == "if_compare" || op == "if_var" || op == "if_random" ||
                            op == "repeat_until_var" || op == "wait_until_key" || op == "wait_until_var" ||
                            op == "stop_this" || op == "stop_all" || op == "calc" || op == "unary_set" ||
                            op == "pick_random" || op == "compare_set" || op == "copy_var" || op == "list_delete" ||
                            op == "list_replace" || op == "list_len_store" || op == "store_sensor" ||
                            op == "store_timer" || op == "store_random" || op == "change_camera_distance" ||
                            op == "set_camera_target" || op == "camera_look_name" || op == "camera_shake" ||
                            op == "spawn" || op == "set_sky" || op == "play_drum";
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
        obj->animClip = "walk";
    } else if (op == "stop_anim") {
        obj->animating = false;
        obj->animClip = "idle";
    } else if (op == "play_anim") {
        obj->animClip = arg(block, "name", "walk");
        obj->animating = obj->animClip != "idle";
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
    } else if (op == "change_volume") {
        if (ctx.scene) ctx.scene->volume = clampf(ctx.scene->volume + argf(block, "value", -10), 0, 100);
    } else if (op == "stop_sounds") {
        lastSound_.clear();
        if (ctx.scene) ctx.scene->lastSound.clear();
    } else if (op == "touching_edge") {
        if (obj) {
            if (std::fabs(obj->transform.position.x) > 6) obj->velocity.x *= -1;
            if (std::fabs(obj->transform.position.z) > 6) obj->velocity.z *= -1;
        }
    } else if (op == "set_gravity") {
        if (ctx.scene) ctx.scene->gravity = argf(block, "value", -20);
    } else if (op == "set_fov") {
        if (ctx.scene) ctx.scene->camera.fov = argf(block, "value", 50);
    } else if (op == "camera_look") {
        if (ctx.scene && obj) ctx.scene->camera.target = obj->transform.position;
    } else if (op == "set_camera_orbit") {
        if (ctx.scene) {
            ctx.scene->camera.yaw = argf(block, "yaw", ctx.scene->camera.yaw);
            ctx.scene->camera.pitch = argf(block, "pitch", ctx.scene->camera.pitch);
            ctx.scene->camera.distance = argf(block, "distance", ctx.scene->camera.distance);
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "set_camera_yaw") {
        if (ctx.scene) {
            ctx.scene->camera.yaw = argf(block, "value", 45);
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "set_camera_pitch") {
        if (ctx.scene) {
            ctx.scene->camera.pitch = argf(block, "value", 28);
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "change_camera_yaw") {
        if (ctx.scene) {
            ctx.scene->camera.yaw += argf(block, "value", 10) * ctx.dt;
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "change_camera_pitch") {
        if (ctx.scene) {
            ctx.scene->camera.pitch += argf(block, "value", 10) * ctx.dt;
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "set_camera_distance") {
        if (ctx.scene) {
            ctx.scene->camera.distance = argf(block, "value", 9);
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "camera_follow") {
        if (ctx.scene) ctx.scene->camera.follow = arg(block, "name", obj ? obj->id : "");
    } else if (op == "camera_unfollow") {
        if (ctx.scene) ctx.scene->camera.follow.clear();
    } else if (op == "camera_preset") {
        if (ctx.scene) {
            const std::string p = arg(block, "name", "izometrik");
            if (p == "on") {
                ctx.scene->camera.yaw = 0;
                ctx.scene->camera.pitch = 8;
                ctx.scene->camera.distance = 8;
            } else if (p == "yan") {
                ctx.scene->camera.yaw = 90;
                ctx.scene->camera.pitch = 10;
            } else if (p == "ust") {
                ctx.scene->camera.pitch = 80;
                ctx.scene->camera.distance = 12;
            } else if (p == "fps") {
                ctx.scene->camera.pitch = 5;
                ctx.scene->camera.distance = 2.2f;
            } else {
                ctx.scene->camera.yaw = 45;
                ctx.scene->camera.pitch = 28;
                ctx.scene->camera.distance = 9.2f;
            }
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "turn_left") {
        obj->transform.rotation.y += argf(block, "degrees", 15);
    } else if (op == "turn_right") {
        obj->transform.rotation.y -= argf(block, "degrees", 15);
    } else if (op == "set_heading") {
        obj->transform.rotation.y = argf(block, "degrees", 0);
    } else if (op == "change_heading") {
        obj->transform.rotation.y += argf(block, "degrees", 10) * ctx.dt;
    } else if (op == "move_steps") {
        const float steps = argf(block, "steps", 1) * ctx.dt;
        const float yaw = radians(obj->transform.rotation.y);
        obj->transform.position.x += std::sin(yaw) * steps;
        obj->transform.position.z += std::cos(yaw) * steps;
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
    } else if (op == "set_rot_x") {
        obj->transform.rotation.x = argf(block, "value");
    } else if (op == "set_rot_y") {
        obj->transform.rotation.y = argf(block, "value");
    } else if (op == "set_rot_z") {
        obj->transform.rotation.z = argf(block, "value");
    } else if (op == "change_rot_x") {
        obj->transform.rotation.x += argf(block, "value", 10) * ctx.dt;
    } else if (op == "change_rot_y") {
        obj->transform.rotation.y += argf(block, "value", 10) * ctx.dt;
    } else if (op == "change_rot_z") {
        obj->transform.rotation.z += argf(block, "value", 10) * ctx.dt;
    } else if (op == "stop_moving") {
        obj->velocity = {0, 0, 0};
    } else if (op == "set_dynamic") {
        obj->dynamic = arg(block, "value", "true") != "false";
    } else if (op == "clear_say") {
        obj->sayText.clear();
        obj->sayTime = 0;
    } else if (op == "change_opacity") {
        obj->opacity = clampf(obj->opacity + argf(block, "value", -10) / 100.0f, 0, 1);
    } else if (op == "go_front") {
        obj->layer += 1;
    } else if (op == "go_back") {
        obj->layer -= 1;
    } else if (op == "change_layer") {
        obj->layer += static_cast<int>(argf(block, "value", 1));
    } else if (op == "set_sky") {
        if (ctx.scene) ctx.scene->sky = Color::fromHex(arg(block, "color", "#73b8f2"));
    } else if (op == "play_drum") {
        lastSound_ = arg(block, "name", "kick");
        if (ctx.scene) ctx.scene->lastSound = lastSound_;
    } else if (op == "if_compare") {
        Block cond;
        cond.op = "compare";
        cond.args = block.args;
        runStack(ctx, eval(ctx, cond).asBool() ? (block.thenBranch.empty() ? block.stack : block.thenBranch)
                                              : block.elseBranch);
    } else if (op == "if_var") {
        const auto it = vars_.find(arg(block, "name", "skor"));
        const double a = it == vars_.end() ? 0 : it->second;
        const double b = argf(block, "value", 0);
        const std::string cmp = arg(block, "cmp", ">");
        bool ok = a > b;
        if (cmp == "<") ok = a < b;
        else if (cmp == "=" || cmp == "==") ok = std::fabs(a - b) < 1e-5;
        else if (cmp == ">=") ok = a >= b;
        else if (cmp == "<=") ok = a <= b;
        runStack(ctx, ok ? (block.thenBranch.empty() ? block.stack : block.thenBranch) : block.elseBranch);
    } else if (op == "if_random") {
        Block cond;
        cond.op = "random_chance";
        cond.args = block.args;
        runStack(ctx, eval(ctx, cond).asBool() ? (block.thenBranch.empty() ? block.stack : block.thenBranch)
                                              : block.elseBranch);
    } else if (op == "repeat_until_var") {
        const std::string name = arg(block, "name", "skor");
        const double limit = argf(block, "value", 10);
        int guard = 16;
        while (guard-- > 0 && ctx.budget > 0) {
            const auto it = vars_.find(name);
            if (it != vars_.end() && it->second >= limit) break;
            runStack(ctx, block.stack.empty() ? block.thenBranch : block.stack);
        }
    } else if (op == "stop_this") {
        ctx.yielded = true;
    } else if (op == "stop_all") {
        ctx.yielded = true;
        ctx.budget = 0;
    } else if (op == "calc") {
        Block m;
        m.op = "math";
        m.args = block.args;
        vars_[arg(block, "name", "skor")] = eval(ctx, m).asNumber();
    } else if (op == "unary_set") {
        Block m;
        m.op = "unary";
        m.args = block.args;
        vars_[arg(block, "name", "skor")] = eval(ctx, m).asNumber();
    } else if (op == "pick_random" || op == "store_random") {
        Block m;
        m.op = "random";
        m.args = block.args;
        vars_[arg(block, "name", "r")] = eval(ctx, m).asNumber();
    } else if (op == "compare_set") {
        Block m;
        m.op = "compare";
        m.args = block.args;
        vars_[arg(block, "name", "ok")] = eval(ctx, m).asBool() ? 1 : 0;
    } else if (op == "copy_var") {
        const auto it = vars_.find(arg(block, "from", "skor"));
        vars_[arg(block, "name", "eski")] = it == vars_.end() ? 0 : it->second;
    } else if (op == "list_delete") {
        auto& list = lists_[arg(block, "name", "liste")];
        int i = static_cast<int>(argf(block, "index", 1)) - 1;
        if (i >= 0 && i < static_cast<int>(list.size())) list.erase(list.begin() + i);
    } else if (op == "list_replace") {
        auto& list = lists_[arg(block, "name", "liste")];
        int i = static_cast<int>(argf(block, "index", 1)) - 1;
        if (i >= 0 && i < static_cast<int>(list.size())) list[static_cast<size_t>(i)] = argf(block, "value");
    } else if (op == "list_len_store") {
        vars_[arg(block, "into", "n")] = static_cast<double>(lists_[arg(block, "name", "liste")].size());
    } else if (op == "show_var") {
        const auto it = vars_.find(arg(block, "name", "skor"));
        if (obj) {
            char buf[64];
            std::snprintf(buf, sizeof(buf), "%s = %.2f", arg(block, "name", "skor").c_str(),
                          it == vars_.end() ? 0.0 : it->second);
            obj->sayText = buf;
            obj->sayTime = 2;
        }
    } else if (op == "change_pen_size") {
        obj->penSize = std::max(1.0f, obj->penSize + argf(block, "value", 1));
    } else if (op == "set_pen_color") {
        obj->penColor = Color::fromHex(arg(block, "color", "#22aa66"));
    } else if (op == "stamp") {
        if (ctx.scene) ctx.scene->pendingClones.push_back(obj->id);
    } else if (op == "store_x") {
        vars_[arg(block, "name", "x")] = obj ? obj->transform.position.x : 0;
    } else if (op == "store_y") {
        vars_[arg(block, "name", "y")] = obj ? obj->transform.position.y : 0;
    } else if (op == "store_z") {
        vars_[arg(block, "name", "z")] = obj ? obj->transform.position.z : 0;
    } else if (op == "store_timer") {
        vars_[arg(block, "name", "sure")] = timer_;
    } else if (op == "store_distance") {
        Block d;
        d.op = "distance_to";
        d.args = block.args;
        if (!d.args.count("name") && block.args.count("target")) d.args["name"] = arg(block, "target");
        vars_[arg(block, "name", "mesafe")] = eval(ctx, d).asNumber();
    } else if (op == "store_sensor") {
        const std::string sensor = arg(block, "sensor", "x");
        const std::string name = arg(block, "name", "deger");
        double v = 0;
        if (sensor == "x") v = obj ? obj->transform.position.x : 0;
        else if (sensor == "y") v = obj ? obj->transform.position.y : 0;
        else if (sensor == "z") v = obj ? obj->transform.position.z : 0;
        else if (sensor == "heading") v = obj ? obj->transform.rotation.y : 0;
        else if (sensor == "timer") v = timer_;
        else if (sensor == "size") v = obj ? obj->size : 100;
        else if (sensor == "costume") v = obj ? obj->costumeIndex + 1 : 1;
        else if (sensor == "grounded") v = obj && obj->grounded ? 1 : 0;
        else if (sensor == "key") v = ctx.keys && ctx.keys->count(arg(block, "key", "Space")) ? 1 : 0;
        else if (sensor == "volume") v = ctx.scene ? ctx.scene->volume : 80;
        else if (sensor == "distance") {
            Block d;
            d.op = "distance_to";
            d.args["name"] = arg(block, "target", arg(block, "name", ""));
            v = eval(ctx, d).asNumber();
        } else if (sensor == "random") {
            Block r;
            r.op = "random";
            r.args = block.args;
            v = eval(ctx, r).asNumber();
        }
        vars_[name] = v;
    } else if (op == "change_camera_distance") {
        if (ctx.scene) {
            ctx.scene->camera.distance += argf(block, "value", -1);
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "set_camera_target") {
        if (ctx.scene) {
            ctx.scene->camera.target = {argf(block, "x"), argf(block, "y", 0.5f), argf(block, "z")};
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "camera_look_name") {
        if (ctx.scene) {
            GameObject* other = ctx.scene->find(arg(block, "name"));
            if (!other) other = ctx.scene->findByName(arg(block, "name"));
            if (other) {
                ctx.scene->camera.target = other->transform.position;
                ctx.scene->camera.refreshOrbit();
            }
        }
    } else if (op == "camera_shake") {
        if (ctx.scene) {
            const float mag = argf(block, "value", 8);
            ctx.scene->camera.yaw += (static_cast<float>(std::rand() % 200) / 100.0f - 1.0f) * mag;
            ctx.scene->camera.pitch += (static_cast<float>(std::rand() % 200) / 100.0f - 1.0f) * mag * 0.4f;
            ctx.scene->camera.refreshOrbit();
        }
    } else if (op == "spawn") {
        if (ctx.scene) {
            GameObject spawned;
            spawned.mesh = meshTypeFromName(arg(block, "mesh", "cube"));
            spawned.transform.position = {argf(block, "x"), argf(block, "y", 1), argf(block, "z")};
            spawned.dynamic = spawned.mesh != MeshType::Plane;
            spawned.color = {0.9f, 0.4f, 0.2f};
            ctx.scene->add(spawned);
        }
    } else if (op == "delete_this") {
        if (obj && ctx.scene) ctx.scene->remove(obj->id);
    } else if (op == "wait" || op == "wait_until_key" || op == "wait_until_var") {
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
            } else if (script.waitLeft > 0) {
                run = true;
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
        } else if (hat == "when_timer" || hat == "sure_dolunca") {
            run = timer_ >= argf(script.hat, "seconds", 1) && !script.startDone;
            if (run) script.startDone = true;
        } else if (hat == "when_var" || hat == "degisken_buyukse") {
            const auto it = vars_.find(arg(script.hat, "name", "skor"));
            run = it != vars_.end() && it->second > argf(script.hat, "value", 0);
        } else if (hat == "when_touching" || hat == "deginece") {
            Block cond;
            cond.op = "touching";
            cond.args = script.hat.args;
            run = eval(ctx, cond).asBool();
        }

        if (!run) continue;
        if (script.waitLeft > 0) {
            script.waitLeft -= dt;
            continue;
        }

        for (const auto& block : script.stack) {
            if (ctx.budget <= 0 || ctx.yielded) break;
            const std::string bop = lower(block.op);
            if (bop == "wait") {
                script.waitLeft = argf(block, "seconds", 1);
                break;
            }
            if (bop == "wait_until_key") {
                if (!keys.count(arg(block, "key", "Space"))) break;
                continue;
            }
            if (bop == "wait_until_var") {
                const auto it = vars_.find(arg(block, "name", "skor"));
                if (it == vars_.end() || it->second < argf(block, "value", 1)) break;
                continue;
            }
            if (bop == "stop_this") break;
            if (bop == "stop_all") {
                ctx.budget = 0;
                break;
            }
            runBlock(ctx, block);
        }
    }
}

}  // namespace blok
