---
status: accepted
---

# Separate child and management write surfaces

The main website is read-only for hunt state and may write only the user-controlled Record 1 action. The management app owns initialisation, bulk writes, spot configuration, and deliberate debug operations. This separation protects the child-facing hunt loop and makes operational writes explicit.
