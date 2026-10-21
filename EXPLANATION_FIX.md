# Explanation validation

Current behavior is documented in [EXPLANATION_LIMIT_240.md](EXPLANATION_LIMIT_240.md) and [YOUNG_MATCHING.md](YOUNG_MATCHING.md).

The hard limit is 240 characters; prompt target is 110-170 characters in second person. Retain factually valid AI text unchanged, safely shorten only excess text, otherwise fall back. Preserve negation/uncertainty and independent ranking/explanation source labels. No extra model call is used for shortening.

Offline regression fixtures include the previously rejected 154/143-character reasons and the latest 157/117-character pair. All are preserved unchanged. Unsupported historical claims still fall back. Original raw responses and benchmark reports retain their historical limits/results rather than being rewritten.

Volunteer Nearby contains elderly requests only. Shared helpers/card contracts retain event-kind compatibility, but no Community AI integration is claimed.
