---
status: accepted
---

# Metadata validation is a write gate

Spot writers require structurally valid `x-hunt-meta` before dependent hunt writes, but this is validation rather than cryptographic authentication. The project deliberately supports open tinkering and manual reprogramming, so stronger identity guarantees would add complexity without matching the product intent.
