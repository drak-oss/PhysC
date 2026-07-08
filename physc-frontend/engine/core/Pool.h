#pragma once
#include <vector>
#include "Handle.h"

namespace physics {
    template<typename T>
    class Pool {
        struct Slot {
            T data;
            uint32_t generation = 0;
            bool active = false;
        };
        std::vector<Slot> slots;
        std::vector<uint32_t> freeIndices;
    public:
        Handle<T> insert(const T& item) {
            if (!freeIndices.empty()) {
                uint32_t idx = freeIndices.back();
                freeIndices.pop_back();
                slots[idx].data = item;
                slots[idx].active = true;
                return {idx, slots[idx].generation};
            }
            slots.push_back({item, 0, true});
            return {static_cast<uint32_t>(slots.size() - 1), 0};
        }
        
        T* get(Handle<T> handle) {
            if (handle.index < slots.size() && 
                slots[handle.index].active && 
                slots[handle.index].generation == handle.generation) {
                return &slots[handle.index].data;
            }
            return nullptr;
        }

        const T* get(Handle<T> handle) const {
            if (handle.index < slots.size() && 
                slots[handle.index].active && 
                slots[handle.index].generation == handle.generation) {
                return &slots[handle.index].data;
            }
            return nullptr;
        }
        
        void remove(Handle<T> handle) {
            if (get(handle)) {
                slots[handle.index].active = false;
                slots[handle.index].generation++;
                freeIndices.push_back(handle.index);
            }
        }

        size_t capacity() const { return slots.size(); }
        size_t activeCount() const { return slots.size() - freeIndices.size(); }

        uint32_t getGeneration(uint32_t index) const {
            if (index < slots.size()) return slots[index].generation;
            return 0;
        }

        void clear() {
            freeIndices.clear();
            for (uint32_t i = 0; i < slots.size(); ++i) {
                if (slots[i].active) {
                    slots[i].active = false;
                    slots[i].generation++;
                }
                freeIndices.push_back(i);
            }
        }

        template<typename Func>
        void forEach(Func&& func) {
            for (uint32_t i = 0; i < slots.size(); ++i) {
                if (slots[i].active) {
                    func(Handle<T>{i, slots[i].generation}, slots[i].data);
                }
            }
        }
    };
}
