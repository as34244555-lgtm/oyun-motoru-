#pragma once

#include "blokmotor/json.hpp"
#include "blokmotor/scene.hpp"

#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace blok {

struct Block {
    std::string op;
    std::unordered_map<std::string, std::string> args;
    std::vector<Block> stack;
    std::vector<Block> thenBranch;
    std::vector<Block> elseBranch;
    Block* condition = nullptr;

    Block() = default;
    Block(const Block& other);
    Block& operator=(const Block& other);
    Block(Block&& other) noexcept;
    Block& operator=(Block&& other) noexcept;
    ~Block();

    static Block fromJson(const Json& json);
    Json toJson() const;
};

struct Script {
    std::string target;
    Block hat;
    std::vector<Block> stack;
    float waitLeft = 0;
    bool startDone = false;
    size_t pc = 0;

    static Script fromJson(const Json& json);
    Json toJson() const;
};

class BlockVM {
public:
    void load(const Json& json);
    Json save() const;
    void resetRuntime();
    void tick(Scene& scene, float dt, const std::unordered_set<std::string>& keys);
    Json varsJson() const;
    std::string lastSound() const { return lastSound_; }

    const std::vector<Script>& scripts() const { return scripts_; }
    std::vector<Script>& scripts() { return scripts_; }

private:
    struct Value {
        enum class Kind { Number, Bool, Text };
        Kind kind = Kind::Number;
        double number = 0;
        bool boolean = false;
        std::string text;

        static Value num(double v) {
            Value x;
            x.kind = Kind::Number;
            x.number = v;
            return x;
        }
        static Value booleanValue(bool v) {
            Value x;
            x.kind = Kind::Bool;
            x.boolean = v;
            return x;
        }
        double asNumber() const {
            if (kind == Kind::Bool) return boolean ? 1 : 0;
            if (kind == Kind::Text) {
                try {
                    return std::stod(text);
                } catch (...) {
                    return 0;
                }
            }
            return number;
        }
        bool asBool() const {
            if (kind == Kind::Bool) return boolean;
            if (kind == Kind::Text) return !text.empty();
            return number != 0;
        }
    };

    struct Context {
        Scene* scene = nullptr;
        GameObject* self = nullptr;
        float dt = 0;
        const std::unordered_set<std::string>* keys = nullptr;
        int budget = 0;
        bool yielded = false;
    };

    std::vector<Script> scripts_;
    std::unordered_map<std::string, double> vars_;
    std::unordered_map<std::string, std::vector<double>> lists_;
    std::unordered_set<std::string> broadcasts_;
    std::string lastSound_;
    float timer_ = 0;

    void runStack(Context& ctx, const std::vector<Block>& stack);
    void runBlock(Context& ctx, const Block& block);
    Value eval(Context& ctx, const Block& block);
    GameObject* resolve(Context& ctx, const Block& block);
    static std::string arg(const Block& block, const std::string& key, const std::string& fallback = "");
    static float argf(const Block& block, const std::string& key, float fallback = 0);
};

}  // namespace blok
