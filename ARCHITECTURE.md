# Offline race architecture

The Milestone 2 baseline uses the inherited deterministic road runner in its existing_v1 mode. StageInput remains the full engine input, including rider attributes, equipment, team orders and weather. The version 1 contracts validate the integration boundary for stage identity, input geometry, group samples, accepted attacks, events, timeline revisions, checkpoint metadata and classifications. These contracts do not replace StageInput or implement command handling.

## Clocks and groups

Race seconds measure simulated elapsed time from the start. A tick is a nonnegative integer index in one versioned simulation. An accepted command records an effective tick and positive order sequence. The offline harness uses explicit tick and sample intervals. Game time and live presentation time stay separate, and the existing backend live-window policy remains authoritative. The deployed mapping and live command deadlines remain to be confirmed before a real-time integration. A material change to that policy requires owner approval.

An active rider may occur in one group at most in a sample. Source group IDs carry identity across samples. Track same-time separation from group km and crossing-time gaps from a shared location. Label estimates separately. Classification ranks belong to finished riders. Checkpoint metadata references serialized state by version and digest. Full resume state and restore proof belong to U3.01.
