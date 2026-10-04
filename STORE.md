# STORE.md — Get Clocked: Remove Ads IAP + ads

## Products

| Product ID | Title | Type | Price (web fallback) |
|---|---|---|---|
| `boygames.getclocked.remove_ads` | Remove Ads | Non-consumable | $2.99 |

- Entitlement persisted at localStorage key `boygames.getclocked.entitlements` as `{remove_ads: true}`.
- `window.BoyGames.store.isOwned(id)` reads that cache synchronously.
- **Final store IDs:** the JS constant stays `boygames.getclocked.remove_ads`. Register the identical
  product ID in App Store Connect / Google Play Console (the app's bundle ID is a separate wrapper-level
  concern, not part of the product ID). The native wrapper maps 1:1.

## Native bridge contract (`window.BoyGamesNative`)

The future app wrapper (StoreKit 2 on iOS / Play Billing on Android) injects:

```js
window.BoyGamesNative = {
  store: {
    // -> Promise<[{id, title, price}]>  (price = localized store string)
    getProducts: function () { /* ... */ },
    // -> Promise<{owned: bool}>  (cancelled/pending -> {owned:false})
    purchase: function (productId) { /* ... */ },
    // -> Promise<{ownedIds: []}>  (AppStore.sync / queryPurchases)
    restore: function () { /* ... */ }
  },
  ads: {
    showBanner: function () { /* native banner view */ },
    hideBanner: function () { /* remove native banner view */ },
    showInterstitial: function (context) { /* e.g. "between-rounds" */ }
  }
};
```

Notes:
- `purchase()` must resolve `{owned:false}` on user cancel / pending — never throw for a cancel.
- `restore()` should also refresh the local entitlement cache on the native side.
- On the web (no bridge): `getProducts()` returns a fixed demo catalog; `purchase()` flips the
  entitlement only under `?dev=1` (demo mode); otherwise it is a no-op.

## Ad placements (Get Clocked)

- **Banner:** home screen, below the menu (`.adslot` container). Never during a round.
- **Interstitial:** `maybeInterstitial("between-rounds")` fires from the reveal screen's
  "NEXT ROUND →" button. Frequency-capped: at most 1 per 3 minutes, never while
  `setGameplayActive(true)` (rank / pass / clock screens).
- **Web fallback:** house ads — cross-promo cards for Liverpool Rummy and BoyGames HQ.
- **Remove Ads owners:** all ad rendering is skipped silently (`isRemoved()` check first).

## Kill switch (ads OFF by default)

- `BoyGames.config.adsEnabled`, resolved in this order (first hit wins), cached, **fails closed to `false`**:
  1. `?ads=1` / `?ads=0` URL param (testing).
  2. localStorage `boygames.getclocked.adsOverride` = `"on"` / `"off"` (testing).
  3. **Remote flag service** — `GET https://boygames-flags.absolukie.workers.dev/api/flags?app=get-clocked`
     → `{ "flags": { "adsEnabled": bool } }`. Toggled from the phone dashboard at
     https://boygames-flags.absolukie.workers.dev/ — changes go live within ~60s, no redeploy.
     Cached in localStorage for 5 minutes (stale-while-revalidate).
  4. `/config.json` → `{ "adsEnabled": bool }` — local fallback, shipped as `{"adsEnabled": false}`.
- Remove Ads stays independent: an owner never sees ads even with the kill switch on.

## Settings UI

- The "🚫 Remove Ads" row appears **only when ads are currently enabled**
  (kill switch on via config/override, and not already owned). When ads are off, the row stays hidden —
  nothing to remove.
- Row shows the localized price from `getProducts()`, tap → `purchase()` → "✓ Ads removed".
- A "Restore purchases" link sits under the row.
