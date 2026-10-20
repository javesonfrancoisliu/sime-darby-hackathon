# Offline explanation regression fixture

`response.json` is the unchanged fictional model response from the previously approved single attempt, copied from its local audit. No new inference was performed.

The current validator preserves both explanations unchanged under the 240-character limit. Historical responses remain third-person verbatim; the revised production prompt requests second person for future approved inference.

Original 15-scenario benchmark reports and the earlier 140-character preview are preserved. Offline replay validates the original captured hashes and dataset payload separately from the revised prompt.
