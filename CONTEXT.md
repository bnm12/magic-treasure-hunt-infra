# Tryllestavsprojekt glossary

This glossary defines the project terms used across the website, firmware, operations, and documentation.

## Experience

**Wand**:
The personal physical object a child carries through one or more hunts.
_Avoid_: tag, token

**Magic spot**:
A physical hunt location where a child taps a wand to collect that location.
_Avoid_: checkpoint, beacon

**Spot box**:
The enclosure and electronics installed at a magic spot.
_Avoid_: station, kiosk

**Hunt year**:
One independently addressable edition of the treasure hunt.
_Avoid_: season, campaign

**Hunt assets**:
The content that describes a hunt, including its branding, spots, hints, messages, and images.
_Avoid_: hunt database, backend content

**Hunt catalog**:
The authoritative view of available hunt assets and the hunts and spots they describe.
_Avoid_: hunt database, asset loader

## Wand data

**Record 1**:
The wand holder's personal NFC action record, kept separate from hunt progress.
_Avoid_: user record, first hunt record

**Hunt record**:
A wand entry representing the spots collected in one hunt year.
_Avoid_: ledger row, event record

**Wand metadata**:
Descriptive information associated with a wand and its owner; it is not proof of identity.
_Avoid_: authentication, security token, identity proof

**Initialised wand**:
A wand prepared for a child to carry through hunts.
_Avoid_: official identity, trusted wand

**Open tinkering**:
The intentional ability to manually reprogram and experiment with a wand; its metadata does not establish cryptographic trust.
_Avoid_: locked device, trusted device

**Organiser**:
The person who prepares hunt content, configures spot boxes, prepares wands, and supports the event.
_Avoid_: operator, administrator
