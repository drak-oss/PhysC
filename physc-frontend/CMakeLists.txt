cmake_minimum_required(VERSION 3.10)
project(ConstraintSolver)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED True)

include_directories(engine)

set(SOURCES
    engine/physics/BodyManager.cpp
    engine/physics/ShapeManager.cpp
    engine/collision/DynamicTree.cpp
    engine/collision/CollisionManager.cpp
    engine/collision/Narrowphase.cpp
    engine/wasm/Bindings.cpp
)

if (EMSCRIPTEN)
    add_executable(solver ${SOURCES})
    set_target_properties(solver PROPERTIES LINK_FLAGS "-lembind -s MODULARIZE=1 -s EXPORT_NAME=createSolver -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s WASM=1 -O3")
else()
    add_executable(solver_native ${SOURCES})
endif()
