#include "blokmotor/engine.hpp"
#include "blokmotor/json.hpp"
#include "blokmotor/math.hpp"
#include "blokmotor/physics.hpp"
#include "blokmotor/renderer.hpp"
#include "blokmotor/scene.hpp"
#include "blokmotor/vm.hpp"

#include <algorithm>
#include <cmath>
#include <iostream>
#include <string>
#include <unordered_set>

namespace {

int gFailed = 0;
int gPassed = 0;

void check(bool cond, const char* expr, const char* file, int line) {
    if (cond) {
        ++gPassed;
        return;
    }
    ++gFailed;
    std::cerr << "FAIL " << file << ":" << line << "  " << expr << "\n";
}

#define CHECK(expr) check(static_cast<bool>(expr), #expr, __FILE__, __LINE__)

}  // namespace

int main() {
    using namespace blok;

    {
        const Vec3 a{1, 0, 0};
        const Vec3 b{0, 1, 0};
        const Vec3 c = a.cross(b);
        CHECK(std::fabs(c.z - 1) < 1e-5f);
        CHECK(std::fabs(a.dot(b)) < 1e-5f);
        CHECK(std::fabs(Vec3{3, 4, 0}.length() - 5) < 1e-5f);
    }

    {
        const Mat4 t = Mat4::translation({2, 3, 4});
        const Vec3 p = t.transformPoint({1, 1, 1});
        CHECK(std::fabs(p.x - 3) < 1e-5f);
        CHECK(std::fabs(p.y - 4) < 1e-5f);
        CHECK(std::fabs(p.z - 5) < 1e-5f);
    }

    {
        const Json parsed = Json::parse(R"({"ok":true,"n":3.5,"s":"merhaba","a":[1,2]})");
        CHECK(parsed["ok"].asBool());
        CHECK(std::fabs(parsed["n"].asNumber() - 3.5) < 1e-9);
        CHECK(parsed["s"].asString() == "merhaba");
        CHECK(parsed["a"].size() == 2);
        const Json again = Json::parse(parsed.dump());
        CHECK(again["s"].asString() == "merhaba");
    }

    {
        Scene scene = Scene::makeDefault();
        CHECK(scene.find("cube") != nullptr);
        CHECK(scene.findByName("Zemin") != nullptr);
        const Json snap = scene.toJson();
        Scene copy = Scene::fromJson(snap);
        CHECK(copy.objects.size() == scene.objects.size());
        CHECK(copy.find("sphere") != nullptr);
    }

    {
        Scene scene;
        GameObject cube;
        cube.id = "c";
        cube.dynamic = true;
        cube.transform.position = {0, 3, 0};
        scene.objects.push_back(cube);
        Physics physics;
        for (int i = 0; i < 90; ++i) physics.step(scene, 1.0f / 30.0f);
        CHECK(scene.objects[0].transform.position.y <= 0.51f);
        CHECK(scene.objects[0].grounded);
    }

    {
        Scene scene;
        GameObject cube;
        cube.id = "cube";
        cube.name = "Kup";
        cube.transform.position = {0, 0.5f, 0};
        scene.objects.push_back(cube);

        Json root = Json::object();
        Json scripts = Json::array();
        Json s = Json::object();
        s["target"] = "cube";
        s["hat"] = "every_frame";
        Json stack = Json::array();
        Json rot = Json::object();
        rot["op"] = "rotate";
        Json args = Json::object();
        args["axis"] = "y";
        args["degrees"] = "90";
        rot["args"] = args;
        stack.push(rot);
        s["stack"] = stack;
        scripts.push(s);
        root["scripts"] = scripts;

        BlockVM vm;
        vm.load(root);
        vm.tick(scene, 1.0f, {});
        CHECK(std::fabs(scene.objects[0].transform.rotation.y - 90.0f) < 1e-3f);
    }

    {
        Scene scene;
        GameObject cube;
        cube.id = "cube";
        cube.grounded = true;
        scene.objects.push_back(cube);
        Json root = Json::parse(R"({
          "scripts":[{
            "target":"cube",
            "hat":"every_frame",
            "stack":[{
              "op":"if",
              "cond":{"op":"key_down","args":{"key":"Space"}},
              "then":[{"op":"jump","args":{"force":"9"}}]
            }]
          }]
        })");
        BlockVM vm;
        vm.load(root);
        vm.tick(scene, 0.016f, {});
        CHECK(std::fabs(scene.objects[0].velocity.y) < 1e-5f);
        vm.tick(scene, 0.016f, {"Space"});
        CHECK(scene.objects[0].velocity.y > 8.0f);
    }

    {
        const Scene scene = Scene::makeDefault();
        SoftwareRenderer renderer(160, 90);
        const Image image = renderer.render(scene);
        CHECK(image.width == 160);
        CHECK(image.rgb.size() == 160 * 90 * 3);
        int colored = 0;
        int maxChannel = 0;
        for (size_t i = 0; i < image.rgb.size(); i += 3) {
            maxChannel = std::max<int>(maxChannel, image.rgb[i]);
            maxChannel = std::max<int>(maxChannel, image.rgb[i + 1]);
            maxChannel = std::max<int>(maxChannel, image.rgb[i + 2]);
            if (image.rgb[i] > 40 || image.rgb[i + 1] > 45 || image.rgb[i + 2] > 70) ++colored;
        }
        CHECK(maxChannel > 80);
        CHECK(colored > 200);
        const std::string bmp = image.toBmp();
        CHECK(bmp.size() > 54);
        CHECK(bmp[0] == 'B' && bmp[1] == 'M');
    }

    {
        Engine engine;
        CHECK(engine.sceneJson()["objects"].size() >= 3);
        engine.play();
        CHECK(engine.playing());
        engine.setKeys({"Space"});
        for (int i = 0; i < 8; ++i) engine.tick(1.0f / 30.0f);
        const float y = engine.stateJson()["objects"].arrayItems()[1]["position"]["y"].asFloat();
        CHECK(y > 0.5f);
        engine.stop();
        CHECK(!engine.playing());
    }

    {
        Scene scene;
        GameObject hero;
        hero.id = "hero";
        hero.costumes = {{"a", ""}, {"b", ""}, {"c", ""}};
        scene.objects.push_back(hero);
        Json root = Json::parse(R"({
          "scripts":[{
            "target":"hero",
            "hat":"every_frame",
            "stack":[{"op":"next_costume"},{"op":"say","args":{"text":"hi","seconds":"1"}}]
          }]
        })");
        BlockVM vm;
        vm.load(root);
        vm.tick(scene, 0.016f, {});
        CHECK(scene.objects[0].costumeIndex == 1);
        CHECK(scene.objects[0].sayText == "hi");
        scene.applyBackdrop("uzay");
        CHECK(scene.backdropId == "uzay");
        CHECK(scene.sky.b < 0.2f);
    }

    {
        Engine engine;
        Json patch = Json::object();
        patch["yaw"] = 90;
        patch["pitch"] = 12;
        patch["distance"] = 8;
        std::string error;
        CHECK(engine.updateCamera(patch, error));
        const Json cam = engine.stateJson()["camera"];
        CHECK(std::fabs(cam["yaw"].asFloat() - 90) < 0.01f);
        CHECK(cam["position"]["x"].asFloat() > 1.0f);
        CHECK(characterKindOf("kedi") == std::string("quadruped"));
        CHECK(characterKindOf("ninja") == std::string("ninja"));
        CHECK(characterKindOf("robot") == std::string("robot"));
        CHECK(characterKindOf("hayalet") == std::string("ghost"));
        CHECK(characterKindOf("balik") == std::string("fish"));
    }

    {
        Scene scene;
        GameObject cube;
        cube.id = "cube";
        cube.transform.position = {3, 2, 1};
        scene.objects.push_back(cube);
        Json root = Json::parse(R"({
          "scripts":[{
            "target":"cube",
            "hat":"every_frame",
            "stack":[
              {"op":"store_x","args":{"name":"x"}},
              {"op":"calc","args":{"name":"skor","a":"4","fn":"+","b":"6"}},
              {"op":"set_camera_target","args":{"x":"1","y":"2","z":"3"}}
            ]
          }]
        })");
        BlockVM vm;
        vm.load(root);
        vm.tick(scene, 0.016f, {});
        CHECK(std::fabs(vm.varsJson()["vars"]["x"].asNumber() - 3) < 1e-4);
        CHECK(std::fabs(vm.varsJson()["vars"]["skor"].asNumber() - 10) < 1e-4);
        CHECK(std::fabs(scene.camera.target.x - 1) < 1e-4);
        CHECK(std::fabs(scene.camera.target.y - 2) < 1e-4);
    }

    {
        Scene scene;
        GameObject hero;
        hero.id = "hero";
        hero.name = "Kahraman";
        hero.transform.position = {2, 0, 0};
        scene.objects.push_back(hero);
        Json root = Json::parse(R"({
          "scripts":[{
            "target":"hero",
            "hat":"every_frame",
            "stack":[{"op":"camera_look_name","args":{"name":"Kahraman"}},{"op":"if_var","args":{"name":"skor","cmp":">","value":"-1"},"then":[{"op":"set_var","args":{"name":"skor","value":"5"}}]}]
          }]
        })");
        BlockVM vm;
        vm.load(root);
        vm.tick(scene, 0.016f, {});
        CHECK(std::fabs(scene.camera.target.x - 2) < 1e-4);
        CHECK(std::fabs(vm.varsJson()["vars"]["skor"].asNumber() - 5) < 1e-4);
    }

    std::cout << "blokmotor tests: " << gPassed << " gecti, " << gFailed << " kaldi\n";
    return gFailed == 0 ? 0 : 1;
}
