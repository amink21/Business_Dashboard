// Shared by every write route (orders, chargers): all of them POST to the
// same Apps Script deployment, so the translation from its handful of
// failure shapes into something a debugging session doesn't need to happen
// to understand lives in one place instead of drifting between routes.
export async function callScript(url, payload) {
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      // An HTML body here means the deployment isn't reachable as we expect -
      // usually "Who has access" is not set to Anyone, or the URL is stale.
      return {
        status: 502,
        body: {
          error:
            'The Apps Script returned a page instead of JSON. Check the deployment is a Web app with access set to "Anyone", and that APPS_SCRIPT_URL is the current /exec URL.',
        },
      };
    }

    if (data.error) {
      // The script only says "Unauthorized" - which of the three usual causes it
      // is saves a debugging session.
      if (/unauthori/i.test(data.error)) {
        return {
          status: 400,
          body: {
            error:
              'The script rejected the token. Check APPS_SCRIPT_TOKEN matches TOKEN in Code.gs exactly, that the token has no $ or # in it (a $ is expanded away by .env parsing), and that you redeployed the script after changing it.',
          },
        };
      }
      if (/unknown action/i.test(data.error)) {
        return {
          status: 400,
          body: {
            error:
              'The deployed Apps Script does not know this action yet. Paste the current google-apps-script/Code.gs into the script editor and deploy a new version.',
          },
        };
      }
      return { status: 400, body: data };
    }
    return { status: 200, body: data };
  } catch (err) {
    return { status: 502, body: { error: `Could not reach the script: ${err.message}` } };
  }
}
