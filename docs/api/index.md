---
title: API reference
outline: [2, 2]
---

# API reference

Every method of the [`YTMusic`](/api/client/YTMusic) client, by area. Each method has its own page with the same sections:

- **Usage**: what it does and a short example
- **Reference**: signature, parameters, options, what it returns and which errors it throws
- **Example output**: a real, trimmed response

Every method is async, and every method takes a `signal` in its options to cancel the call.

**Access** tells you whether a method needs a signed-in client ([how to sign in](/authentication/)):

| Badge | Meaning |
|---|---|
| <AuthBadge auth="none" short /> | works signed out |
| <AuthBadge auth="optional" short /> | works signed out, returns personalized data when signed in |
| <AuthBadge auth="required" short /> | needs a signed-in client |
| <AuthBadge write short /> | changes your account. Never retried. |

<ApiMethods />

## Types

Results and options are fully typed. The [type reference](/reference/) documents every exported interface and type, generated from the source.
