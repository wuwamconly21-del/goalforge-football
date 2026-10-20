// Keep the old provider writable until the new provider is ready for import.
// Once activation is attempted, never automatically reopen the old writer.
export async function cutover(steps) {
  let frozen = false, activationAttempted = false;
  try {
    await steps.prepare();
    // Persist intent before a remote request: a lost response is ambiguous.
    frozen = true;
    await steps.freeze();
    await steps.drain();
    await steps.snapshot();
    await steps.importAndVerify();
    await steps.savePhase('activation-attempted');
    activationAttempted = true;
    await steps.activate();
    await steps.verifyLive();
    await steps.savePhase('cloudflare-live');
    await steps.redirect();
    await steps.savePhase('complete');
  } catch (error) {
    if (frozen && !activationAttempted) {
      try {
        await steps.unfreeze();
        await steps.savePhase('source-restored');
      } catch {
        await steps.savePhase('source-lock-check-required');
      }
    }
    throw error;
  }
}
