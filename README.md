# Willhaben Map

A Chrome extension that displays Willhaben real-estate search results on an interactive map.

## Features

- Displays Willhaben real-estate listings on an interactive map
- Supports current Willhaben real-estate search pages
- Automatically loads all available search result pages
- Interactive property markers
- Shows price, description and property image
- Direct link to the original Willhaben listing
- Automatically fits the map to the search results
- Address search to center the map on a specific location
- No API key required
- No account required
- No credentials required

## Technology

The extension uses:

- **MapLibre GL JS** for map rendering
- **OpenFreeMap** for the map style and map data delivery
- **OpenStreetMap** data
- **OpenStreetMap Nominatim** for address search

No API key or user account is required.

## Installation

Clone the repository:

    git clone https://github.com/bast-i/willhaben-map-extension.git
    cd willhaben-map-extension

Install the dependencies:

    npm install

Build the extension:

    npm run build

Then open Chrome and navigate to:

    chrome://extensions

Enable **Developer mode**, click **Load unpacked** and select the generated:

    build/

directory.

## Usage

1. Open a Willhaben real-estate search page.
2. Click the **Willhaben Map** extension icon.
3. Click **Open Map**.
4. The available listings are displayed on the interactive map.
5. Optionally enter an address to center the map on a specific location.

Supported Willhaben pages start with:

    https://www.willhaben.at/iad/immobilien/

## Address Search

The address search uses the public OpenStreetMap Nominatim service.

The search is only triggered when the user explicitly submits an address. It is not used for autocomplete or background requests.

Please respect the Nominatim usage policy when using or modifying this functionality.

## Privacy

This extension does **not** require or store:

- API keys
- passwords
- authentication tokens
- Willhaben credentials
- personal account credentials

The extension processes the currently opened Willhaben real-estate search to obtain the information required to display listings on the map.

When an address search is performed, the entered address is sent to the OpenStreetMap Nominatim service to obtain geographic coordinates.

## Third-party services

This project uses public third-party services and data provided by:

- OpenStreetMap
- OpenFreeMap
- Nominatim

Their availability and use are subject to their respective terms and usage policies.

This project is not affiliated with, endorsed by, or sponsored by Willhaben, OpenStreetMap, OpenFreeMap, or their respective operators.

## Development

Install dependencies:

    npm install

Create a production build:

    npm run build

After rebuilding, reload the unpacked extension from:

    chrome://extensions

## Version

Current version: **0.2.0**

## License

See the repository license for licensing information.
