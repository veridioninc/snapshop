# Phase 2 Meta API implementation notes

These notes capture the current official Meta contract used by the Phase 2 build.

Meta’s Instagram Platform overview says Facebook Login serves professional Instagram accounts linked to a Facebook Page. The app user must be able to perform admin-equivalent tasks on the connected Page. The Facebook Login setup uses `graph.facebook.com`; the Instagram Login setup uses `graph.instagram.com`. The Phase 2 specification therefore remains on the Facebook Login path for Page-linked Business or Creator accounts.

The current Facebook Login getting-started guide requests `instagram_basic` and `pages_show_list`, reads the user’s Pages from `GET /me/accounts`, resolves the connected Instagram professional account from `GET /{page-id}?fields=instagram_business_account`, and reads media from `GET /{ig-user-id}/media`. The current example uses Graph API v26.0. The implementation keeps permissions configurable but defaults to `instagram_basic,pages_show_list,pages_read_engagement` to match the product specification and media-read contract.

Meta’s access-token reference documents server-side exchange of a short-lived Instagram User access token for a 60-day long-lived token through `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=...&access_token=...`. The Facebook Login flow also returns a Facebook User access token for Graph API calls; the implementation uses the current Facebook Login code exchange for that token and stores only an encrypted-at-rest token record in the project database.

Meta’s IG Media reference documents `media_type`, `media_url`, `thumbnail_url`, `permalink`, `caption`, `timestamp`, and `username`, and notes that `media_url` can be absent for some video/reel cases. Sync therefore falls back to `thumbnail_url` or skips the image while retaining the permalink and caption. Captions are not treated as structured prices; synced records land as draft products for owner confirmation.

Meta’s data-deletion callback documentation requires an HTTPS POST callback receiving a signed request, prompt deletion of the app’s stored Facebook data, and a JSON response containing a human-readable status URL and an alphanumeric confirmation code. The callback is implemented at `/api/meta/data-deletion` and stores a deletion request status record before returning the response.

## Sources

- https://developers.facebook.com/documentation/instagram-platform/overview
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/get-started
- https://developers.facebook.com/documentation/instagram-platform/reference/access_token
- https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media
- https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow
- https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/data-deletion-callback
