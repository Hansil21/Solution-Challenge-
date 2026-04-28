# Security Specification: ContentGuard

## Data Invariants
1. An `OfficialVideo` must have a valid `userId` matching the authenticated user.
2. A `ScanResult` must point to a valid `comparedTo` document ID.
3. Access to documents is strictly private (owner-only).

## The Dirty Dozen Payloads
1. **Identity Theft**: Trying to create a video with another user's ID.
2. **Ghost Video**: Creating a video with massive fileSize (>100GB).
3. **ID Poisoning**: Using a 1MB string as a document ID.
4. **Shadow Update**: Adding an `isAdmin: true` field to a user profile (not implemented here, but good to think about).
5. **PII Breach**: Trying to read another user's scan results.
6. **Malicious Link**: Injecting a 10KB URL into `suspectUrl`.
7. **Score Spoofing**: Setting `similarityScore` to 101.
8. **Time Travel**: Setting `scannedAt` to the past.
9. **Relational Sync Break**: Creating a `ScanResult` for a non-existent video.
10. **Partial Update Gap**: Modifying `fileName` of a protected asset (should be immutable or strictly controlled).
11. **Bulk Scrape**: Executing a `list` query without a `userId` filter.
12. **Anonymous Write**: Trying to upload without authentication.

## Test Runner Plan
I will use the standard `firestore.rules` structure with helpers for validation.
