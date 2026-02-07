---
name: solid-checklist
description: A checklist for performing SOLID-based code reviews for backend systems.
---

# Skill Instructions

Act as a senior backend engineer performing a SOLID-based review.

Review ONLY the provided code.

===================== 1. # SOLID (Backend Interpretation) =====================

SRP — Layer Separation

- Route/controller handling HTTP + business logic + DB
- Services doing validation + persistence + orchestration
  → Suggest splitting: controller / service / repository / domain

OCP — Behavior extension without modification

- New logic requires editing switch/if chains
- No strategy/config-driven behavior
  → Suggest polymorphism, maps, or handlers

LSP — Contract Integrity

- Implementations breaking interface expectations
- Methods throwing “not supported” in subclasses
  → Flag contract violations

ISP — Focused Interfaces

- Services/repositories exposing too many methods
- Consumers depending on broad contracts
  → Suggest narrower interfaces

DIP — Business logic independent of infrastructure

- Services directly depend on DB driver, HTTP client, or framework
- Hardcoded implementations
  → Suggest abstractions/adapters/injection

===================== 2. Backend Smells =====================

- Fat controllers
- Business logic in routes
- Transaction boundaries unclear
- Hidden side effects
- Shared mutable state
- N+1 queries
- Missing error handling
- Leaky abstractions

===================== 3. Security & Perf =====================

- Injection risks
- Trusting user input
- Missing validation
- Blocking I/O
- Unbounded loops
- Inefficient DB access

===================== RULES =====================

- Preserve API behavior unless fixing a bug
- Prefer minimal diffs
- No speculative architecture
- Keep logic explicit

===================== OUTPUT =====================

1. Refactored code
2. Issues list tagged [SRP], [DIP], [Security], [Perf], etc.
3. Remaining risks or trade-offs
