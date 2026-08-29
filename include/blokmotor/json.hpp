#pragma once

#include <map>
#include <string>
#include <vector>

namespace blok {

class Json {
public:
    enum class Type { Null, Bool, Number, String, Array, Object };

    Json() = default;
    Json(std::nullptr_t) {}
    Json(bool v) : type_(Type::Bool), bool_(v) {}
    Json(int v) : type_(Type::Number), number_(static_cast<double>(v)) {}
    Json(double v) : type_(Type::Number), number_(v) {}
    Json(float v) : type_(Type::Number), number_(v) {}
    Json(const char* v) : type_(Type::String), string_(v ? v : "") {}
    Json(std::string v) : type_(Type::String), string_(std::move(v)) {}

    static Json array() {
        Json j;
        j.type_ = Type::Array;
        return j;
    }
    static Json object() {
        Json j;
        j.type_ = Type::Object;
        return j;
    }

    Type type() const { return type_; }
    bool isNull() const { return type_ == Type::Null; }
    bool isBool() const { return type_ == Type::Bool; }
    bool isNumber() const { return type_ == Type::Number; }
    bool isString() const { return type_ == Type::String; }
    bool isArray() const { return type_ == Type::Array; }
    bool isObject() const { return type_ == Type::Object; }

    bool asBool(bool fallback = false) const { return type_ == Type::Bool ? bool_ : fallback; }
    double asNumber(double fallback = 0) const { return type_ == Type::Number ? number_ : fallback; }
    float asFloat(float fallback = 0) const { return static_cast<float>(asNumber(fallback)); }
    int asInt(int fallback = 0) const { return static_cast<int>(asNumber(fallback)); }
    const std::string& asString() const { return string_; }
    std::string asString(const std::string& fallback) const {
        return type_ == Type::String ? string_ : fallback;
    }

    const std::vector<Json>& arrayItems() const { return array_; }
    std::vector<Json>& arrayItems() { return array_; }
    const std::map<std::string, Json>& objectItems() const { return object_; }
    std::map<std::string, Json>& objectItems() { return object_; }

    Json& operator[](const std::string& key) {
        type_ = Type::Object;
        return object_[key];
    }
    const Json& operator[](const std::string& key) const {
        static const Json kNull;
        auto it = object_.find(key);
        return it == object_.end() ? kNull : it->second;
    }
    Json& operator[](size_t index) { return array_.at(index); }
    const Json& operator[](size_t index) const { return array_.at(index); }

    bool has(const std::string& key) const { return object_.count(key) > 0; }

    void push(Json value) {
        type_ = Type::Array;
        array_.push_back(std::move(value));
    }

    size_t size() const {
        if (type_ == Type::Array) return array_.size();
        if (type_ == Type::Object) return object_.size();
        return 0;
    }

    std::string dump(int indent = 0) const;
    static Json parse(const std::string& text);
    static bool tryParse(const std::string& text, Json& out, std::string* error = nullptr);

private:
    Type type_ = Type::Null;
    bool bool_ = false;
    double number_ = 0;
    std::string string_;
    std::vector<Json> array_;
    std::map<std::string, Json> object_;
};

}  // namespace blok
