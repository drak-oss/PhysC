call "C:\Users\Devendra Agashe\emsdk\emsdk.bat" activate latest
call "C:\Users\Devendra Agashe\emsdk\emsdk_env.bat"
cd build
cmake --build . --clean-first
cmake -E copy solver.js ../public/
cmake -E copy solver.wasm ../public/
