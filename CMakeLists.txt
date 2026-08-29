cmake_minimum_required(VERSION 3.16)
project(blokmotor LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# clang++ as /usr/bin/c++ may fail to find libstdc++ on some images.
if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    add_compile_options(-stdlib=libstdc++)
    add_link_options(-stdlib=libstdc++)
endif()

if(NOT MSVC)
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

set(BLOKMOTOR_SOURCES
    src/json.cpp
    src/scene.cpp
    src/physics.cpp
    src/renderer.cpp
    src/vm.cpp
    src/engine.cpp
)

add_library(blokmotor_core STATIC ${BLOKMOTOR_SOURCES})
target_include_directories(blokmotor_core PUBLIC ${CMAKE_SOURCE_DIR}/include)
find_package(Threads REQUIRED)
target_link_libraries(blokmotor_core PUBLIC Threads::Threads)

add_executable(blokmotor src/main.cpp src/server.cpp)
target_link_libraries(blokmotor PRIVATE blokmotor_core)

add_executable(blokmotor_tests tests/test_core.cpp)
target_link_libraries(blokmotor_tests PRIVATE blokmotor_core)

enable_testing()
add_test(NAME blokmotor_tests COMMAND blokmotor_tests)

file(COPY ${CMAKE_SOURCE_DIR}/web DESTINATION ${CMAKE_BINARY_DIR})
file(COPY ${CMAKE_SOURCE_DIR}/examples DESTINATION ${CMAKE_BINARY_DIR})
