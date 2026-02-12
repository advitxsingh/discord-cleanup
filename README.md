# Discord Cleanup

Bulk delete your own messages from Discord servers.

## Features

- Token-based authentication
- Server selection
- Real-time deletion progress
- Stop/pause functionality
- Rate limit handling

## Usage

1. Get your Discord token from Developer Tools
2. Enter the token in the app
3. Select a server
4. Click "Start Purge"
5. Click "Stop" to cancel

## How to get your token

1. Login to discord.com in Chrome or Edge
2. Press F12 or Ctrl+Shift+I
3. Go to Network tab
4. Look for a request named "messages"
5. Find "authorization" in Headers and copy that string

## Warning

Use at your own risk. Discord may rate-limit or temporarily restrict your account.

## Development

```bash
npm install
npm run dev
```

## License

MIT
