#ifndef WAND_FIXTURES_H
#define WAND_FIXTURES_H

#include <stddef.h>
#include <stdint.h>

namespace WandFixtures {
struct Fixture { const uint8_t* data; size_t length; };

inline constexpr uint8_t duplicateMerge[] = {
  145, 1, 12, 85, 104, 116, 116, 112, 115, 58, 47, 47, 119, 97, 110, 100,
  18, 10, 6, 116, 101, 120, 116, 47, 112, 108, 97, 105, 110, 111, 112, 97,
  113, 117, 101, 18, 11, 8, 120, 45, 104, 117, 110, 116, 58, 50, 48, 50,
  54, 0, 0, 0, 0, 0, 0, 0, 5, 18, 11, 8, 120, 45, 104, 117,
  110, 116, 58, 50, 48, 50, 54, 0, 0, 0, 0, 0, 0, 0, 2, 18,
  11, 8, 120, 45, 104, 117, 110, 116, 58, 50, 48, 50, 53, 0, 0, 0,
  0, 0, 0, 0, 8, 82, 11, 6, 120, 45, 104, 117, 110, 116, 45, 109,
  101, 116, 97, 7, 234, 3, 65, 100, 97,
};
inline constexpr Fixture duplicateMergeFixture{duplicateMerge, sizeof(duplicateMerge)};

inline constexpr uint8_t opaqueAliasesAndMalformedMetadata[] = {
  145, 1, 2, 85, 104, 105, 18, 23, 8, 97, 112, 112, 108, 105, 99, 97,
  116, 105, 111, 110, 47, 120, 45, 104, 117, 110, 116, 58, 50, 48, 50, 54,
  0, 0, 0, 0, 0, 0, 0, 255, 18, 19, 2, 120, 45, 104, 117, 110,
  116, 45, 105, 110, 118, 97, 108, 105, 100, 58, 50, 48, 50, 54, 1, 2,
  82, 11, 4, 120, 45, 104, 117, 110, 116, 45, 109, 101, 116, 97, 7, 234,
  5, 65,
};
inline constexpr Fixture opaqueAliasesAndMalformedMetadataFixture{opaqueAliasesAndMalformedMetadata, sizeof(opaqueAliasesAndMalformedMetadata)};

inline constexpr uint8_t websiteMime[] = {
  145, 1, 2, 85, 104, 105, 18, 11, 8, 120, 45, 104, 117, 110, 116, 58,
  50, 48, 50, 54, 0, 0, 0, 0, 0, 0, 0, 1, 18, 11, 8, 120,
  45, 104, 117, 110, 116, 58, 50, 48, 50, 54, 0, 0, 0, 0, 0, 0,
  0, 2, 82, 11, 6, 120, 45, 104, 117, 110, 116, 45, 109, 101, 116, 97,
  7, 234, 3, 65, 100, 97,
};
inline constexpr Fixture websiteMimeFixture{websiteMime, sizeof(websiteMime)};

inline constexpr uint8_t repairKeepsValidSameYear[] = {
  145, 1, 2, 85, 104, 105, 18, 11, 2, 120, 45, 104, 117, 110, 116, 58,
  50, 48, 50, 54, 1, 2, 18, 11, 8, 120, 45, 104, 117, 110, 116, 58,
  50, 48, 50, 54, 0, 0, 0, 0, 0, 0, 0, 1, 82, 11, 6, 120,
  45, 104, 117, 110, 116, 45, 109, 101, 116, 97, 7, 234, 3, 65, 100, 97,
};
inline constexpr Fixture repairKeepsValidSameYearFixture{repairKeepsValidSameYear, sizeof(repairKeepsValidSameYear)};

inline constexpr uint8_t repairCreatesMissingYear[] = {
  145, 1, 2, 85, 104, 105, 18, 11, 2, 120, 45, 104, 117, 110, 116, 58,
  50, 48, 50, 54, 1, 2, 82, 11, 6, 120, 45, 104, 117, 110, 116, 45,
  109, 101, 116, 97, 7, 234, 3, 65, 100, 97,
};
inline constexpr Fixture repairCreatesMissingYearFixture{repairCreatesMissingYear, sizeof(repairCreatesMissingYear)};

inline constexpr Fixture all[] = {
  duplicateMergeFixture,
  opaqueAliasesAndMalformedMetadataFixture,
  websiteMimeFixture,
  repairKeepsValidSameYearFixture,
  repairCreatesMissingYearFixture,
};

}  // namespace WandFixtures

#endif
