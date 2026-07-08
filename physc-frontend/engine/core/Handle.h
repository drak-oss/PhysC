#pragma once
#include <cstdint>

namespace physics {
    template<typename T>
    struct Handle {
        uint32_t index = static_cast<uint32_t>(-1);
        uint32_t generation = 0;
        
        bool isValid() const { return index != static_cast<uint32_t>(-1); }
        bool operator==(const Handle& rhs) const { return index == rhs.index && generation == rhs.generation; }
        bool operator!=(const Handle& rhs) const { return !(*this == rhs); }
    };
}
