---
status: accepted
---

# Wand NFC contract

The v1.0 wand contract uses `x-hunt:<YYYY>` hunt records with an 8-byte spot mask and an `x-hunt-meta` metadata record. Record 1 remains user-controlled, and physical record order is non-semantic. This strict, compact contract keeps multi-year data durable within the NTAG216 glass-ampoule capacity target while avoiding a migration format before production data exists.

