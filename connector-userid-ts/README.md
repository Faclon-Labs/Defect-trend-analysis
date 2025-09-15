# Faclon Connector TypeScript

A TypeScript connector for accessing Faclon IoT platform data with full type safety and modern ES module support.

## 🚀 Installation

Install the package from npm:

```bash
npm install connector-userid-ts
# or
yarn add connector-userid-ts
# or
pnpm add connector-userid-ts
```

### Alternative: Local Development

If you're developing locally or using a private copy:

```bash
# From a local directory
npm install ../connector-userid-ts

# Or add to package.json
{
  "dependencies": {
    "connector-userid-ts": "file:../connector-userid-ts"
  }
}
```

## 📋 Requirements

- Node.js 18+ 
- TypeScript 5.0+
- Modern bundler with ES module support

## 📦 NPM Package

This package is published on npm registry as `connector-userid-ts`. It includes:

- ✅ Pre-compiled TypeScript definitions
- ✅ ES module support
- ✅ CommonJS compatibility
- ✅ Tree-shaking support
- ✅ Zero external dependencies for core functionality

## 🔧 Usage

### Basic Setup

```typescript
import DataAccess from 'connector-userid-ts';

const dataAccess = new DataAccess({
  userId: "your-user-id",
  dataUrl: "your-data-url",
  dsUrl: "your-ds-url", 
  onPrem: false, // true for on-premise installations
  tz: "UTC" // timezone
});
```

### Next.js Integration

#### Server-Side Usage (Recommended)

```typescript
// pages/api/device-data.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import DataAccess from 'connector-userid-ts';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const dataAccess = new DataAccess({
    userId: process.env.FACLON_USER_ID!,
    dataUrl: process.env.FACLON_DATA_URL!,
    dsUrl: process.env.FACLON_DS_URL!,
    onPrem: false,
    tz: "UTC"
  });

  try {
    const devices = await dataAccess.getDeviceDetails();
    res.status(200).json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
}
```

#### Environment Variables (.env.local)

```env
FACLON_USER_ID=your-user-id
FACLON_DATA_URL=your-data-url  
FACLON_DS_URL=your-ds-url
```

#### Client-Side Usage (Use with Caution)

```typescript
// components/DeviceData.tsx
'use client';

import { useEffect, useState } from 'react';

export default function DeviceData() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // Call your API route instead of direct connector usage
    fetch('/api/device-data')
      .then(res => res.json())
      .then(setDevices);
  }, []);

  return (
    <div>
      {devices.map(device => (
        <div key={device.devID}>{device.devID}</div>
      ))}
    </div>
  );
}
```

## 📚 API Reference

### Core Methods

#### `getUserInfo(onPremOverride?: boolean)`
Fetches user information from the API.

```typescript
const userInfo = await dataAccess.getUserInfo();
console.log(userInfo.email);
```

#### `getDeviceDetails(onPremOverride?: boolean)`
Retrieves all devices associated with the user account.

```typescript
const devices = await dataAccess.getDeviceDetails();
devices.forEach(device => {
  console.log(`Device: ${device.devID}, Type: ${device.devTypeID}`);
});
```

#### `getDeviceMetaData(deviceId: string, onPremOverride?: boolean)`
Gets detailed metadata for a specific device.

```typescript
const metadata = await dataAccess.getDeviceMetaData("DEVICE_001");
console.log(`Device Name: ${metadata.devName}`);
console.log(`Sensors: ${metadata.sensors.map(s => s.sensorName).join(', ')}`);
```

#### `getFirstDp(options: GetFirstDpOptions)`
Retrieves the first datapoint(s) for specified sensors.

```typescript
const firstData = await dataAccess.getFirstDp({
  deviceId: "DEVICE_001",
  sensorList: ["TEMP_01", "HUMIDITY_01"],
  cal: true, // Apply calibration
  alias: true, // Use sensor names instead of IDs
  n: 5 // Number of datapoints
});
```

#### `getDp(options: GetDpOptions)`
Retrieves datapoints up to a specified end time.

```typescript
const recentData = await dataAccess.getDp({
  deviceId: "DEVICE_001", 
  endTime: new Date(),
  n: 100,
  cal: true,
  alias: true
});
```

#### `dataQuery(options: DataQueryOptions)`
Queries sensor data within a time range.

```typescript
const rangeData = await dataAccess.dataQuery({
  deviceId: "DEVICE_001",
  startTime: "2024-01-01T00:00:00Z",
  endTime: "2024-01-02T00:00:00Z",
  cal: true,
  alias: true
});
```

#### `getLoadEntities(options?: GetLoadEntitiesOptions)`
Retrieves load entities (clusters) with pagination support.

```typescript
// Get all clusters
const allClusters = await dataAccess.getLoadEntities();

// Filter by specific cluster names
const specificClusters = await dataAccess.getLoadEntities({
  clusters: ["Cluster_A", "Cluster_B"]
});
```

## 🔒 Security Best Practices

### For Next.js Applications

1. **Never expose credentials in client-side code**
2. **Use environment variables for sensitive data**
3. **Create API routes as proxies to the connector**
4. **Validate and sanitize all inputs**

```typescript
// ❌ DON'T - Client-side exposure
const dataAccess = new DataAccess({
  userId: "exposed-user-id", // Visible in browser!
  // ...
});

// ✅ DO - Server-side only
// pages/api/secure-data.ts
const dataAccess = new DataAccess({
  userId: process.env.FACLON_USER_ID!, // Server-side only
  // ...
});
```

## 🛠️ Framework Compatibility

| Framework | Compatibility | Notes |
|-----------|---------------|-------|
| Next.js | ✅ Full | Server-side recommended |
| React | ✅ Full | Use with API proxy |
| Vue.js | ✅ Full | Use with API proxy |
| Nuxt.js | ✅ Full | Server-side recommended |
| SvelteKit | ✅ Full | Server-side recommended |
| Express.js | ✅ Full | Perfect fit |
| Fastify | ✅ Full | Perfect fit |

## 📦 Package Structure

```
connector-userid-ts/
├── connectors/
│   └── DataAccess.ts     # Main connector class
├── utils/
│   └── constants.ts      # API endpoints and constants
├── testcases/            # Test files and examples
│   ├── index.ts          # Basic functionality tests
│   └── test-load-entities.ts # Load entities test
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run example tests
npx tsx testcases/index.ts
npx tsx testcases/test-load-entities.ts
```

### Publishing to NPM

```bash
# Login to npm (one time setup)
npm login

# Bump version (patch/minor/major)
npm version patch

# Publish to npm registry
npm publish
```

The package will automatically:
1. Run tests via `prepublishOnly`
2. Build TypeScript to `dist/`
3. Include only necessary files via `files` array
4. Publish with public access

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Contact Faclon Labs support
- Check the documentation at [docs.faclon.com](https://docs.faclon.com)


# EventsHandler TypeScript Implementation

This document describes the `EventsHandler` class, which has been converted from Python to TypeScript while maintaining the same functionality and API structure.

## Overview

The `EventsHandler` class provides methods to handle event-related operations including:
- Publishing events
- Retrieving events in time slots
- Getting event categories
- Fetching detailed event data
- Managing device data and metadata
- Maintenance module data operations

## Installation

The EventsHandler is part of the connector-userid-ts package. Make sure you have the dependencies installed:

```bash
npm install
```

## Usage

### Basic Setup

```typescript
import { EventsHandler } from 'connector-userid-ts';

const eventsHandler = new EventsHandler({
  userId: 'your-user-id',
  dataUrl: 'your-data-url.com',
  onPrem: false,        // Optional: default false
  tz: 'UTC',           // Optional: default UTC
  logTime: true        // Optional: default false
});
```

## Methods

### 1. `publishEvent(options: PublishEventOptions)`

Publishes an event to the server.

```typescript
const result = await eventsHandler.publishEvent({
  message: 'System maintenance completed',
  metaData: JSON.stringify({ duration: '2 hours', status: 'success' }),
  hoverData: 'Scheduled maintenance was completed successfully',
  title: 'Maintenance Event',
  eventNamesList: ['Maintenance', 'System Update'], // Will be resolved to tag IDs
  createdOn: new Date().toISOString()
});
```

**Options:**
- `message` (string): The main message or description of the event
- `metaData` (string): Metadata associated with the event
- `hoverData` (string): Data to be displayed when hovering over the event
- `createdOn` (string, optional): Creation date in ISO format
- `eventTagsList` (string[], optional): List of pre-existing tag IDs
- `eventNamesList` (string[], optional): List of event names (resolved to tag IDs)
- `title` (string, optional): The title of the event
- `onPrem` (boolean, optional): Override for on-premises server usage

### 2. `getEventsInTimeslot(options: EventsInTimeslotOptions)`

Retrieves events within a specified time slot.

```typescript
const events = await eventsHandler.getEventsInTimeslot({
  startTime: new Date('2023-01-01T00:00:00Z'),
  endTime: new Date('2023-01-31T23:59:59Z'),
  onPrem: false
});
```

**Options:**
- `startTime` (string | Date): Start time for the event search
- `endTime` (string | Date, optional): End time for the event search
- `onPrem` (boolean, optional): Override for on-premises server usage

### 3. `getEventDataCount(options?: EventDataCountOptions)`

Retrieves a specified number of event data records up to a given end time.

```typescript
const eventData = await eventsHandler.getEventDataCount({
  endTime: new Date(),
  count: 100,
  onPrem: false
});
```

**Options:**
- `endTime` (string | Date, optional): End time for data retrieval
- `count` (number, optional): Number of records to retrieve (max 10,000, default 10)
- `onPrem` (boolean, optional): Override for on-premises server usage

### 4. `getEventCategories(options?: { onPrem?: boolean })`

Retrieves a list of event categories from the server.

```typescript
const categories = await eventsHandler.getEventCategories();
```

### 5. `getDetailedEvent(options?: DetailedEventOptions)`

Retrieves detailed event data for a specified time range and event tags.

```typescript
const detailedEvents = await eventsHandler.getDetailedEvent({
  eventTagsList: ['tag1', 'tag2'],
  startTime: new Date('2023-01-01'),
  endTime: new Date('2023-01-31')
});
```

**Options:**
- `eventTagsList` (string[], optional): List of event tags to filter by
- `startTime` (string | Date, optional): Start time for fetching events
- `endTime` (string | Date, optional): End time for fetching events
- `onPrem` (boolean, optional): Override for on-premises server usage

### 6. `getMongoData(options: MongoDataOptions)`

Retrieves data rows for a specific device from the custom table (MongoDB) with optional filtering.

```typescript
const mongoData = await eventsHandler.getMongoData({
  devID: 'Planwise_Production_01',
  limit: 1000,
  startTime: '2025-01-01 00:00:00',
  endTime: '2025-01-31 23:59:59'
});
```

**Options:**
- `devID` (string): Required device identifier
- `limit` (number, optional): Number of records to retrieve
- `startTime` (string, optional): Start time filter in format "YYYY-MM-DD HH:mm:ss"
- `endTime` (string, optional): End time filter in format "YYYY-MM-DD HH:mm:ss"
- `onPrem` (boolean, optional): Override for on-premises server usage

### 7. `getMaintenanceModuleData(options: MaintenanceModuleDataOptions)`

Fetches maintenance module data based on provided parameters.

```typescript
const maintenanceData = await eventsHandler.getMaintenanceModuleData({
  startTime: new Date('2023-01-01'),
  endTime: new Date('2023-01-31'),
  operator: 'count',
  dataPrecision: 2,
  remarkGroup: ['group1', 'group2'],
  eventId: ['event1', 'event2'],
  maintenanceModuleId: 'module123'
});
```

### 8. `getDeviceData(options?: DeviceDataOptions)`

Fetches device data from the API with optional filters.

```typescript
const deviceData = await eventsHandler.getDeviceData({
  devices: ['device1', 'device2'],
  n: 5000,
  endTime: new Date().toISOString(),
  startTime: new Date(Date.now() - 24*60*60*1000).toISOString()
});
```

### 9. `getSensorRows(options: SensorRowsOptions)`

Retrieves device data rows based on sensor parameters.

```typescript
const sensorRows = await eventsHandler.getSensorRows({
  deviceId: 'device123',
  sensor: 'temperature',
  value: '25.3',
  startTime: new Date(Date.now() - 24*60*60*1000).toISOString(),
  endTime: new Date().toISOString(),
  alias: false
});
```

### 10. `getDeviceMetadata(deviceId: string, onPrem?: boolean)`

Fetches metadata for a specific device.

```typescript
const metadata = await eventsHandler.getDeviceMetadata('device123');
```

## Type Definitions

The EventsHandler exports comprehensive TypeScript interfaces for all options and return types:

- `EventsHandlerConfig`
- `PublishEventOptions`
- `EventsInTimeslotOptions`
- `EventDataCountOptions`
- `DetailedEventOptions`
- `MongoDataOptions`
- `MaintenanceModuleDataOptions`
- `DeviceDataOptions`
- `SensorRowsOptions`
- `EventCategory`

## Error Handling

All methods include comprehensive error handling:
- Network errors are logged with detailed information
- API response validation
- Proper TypeScript error types
- Graceful fallbacks (empty arrays/objects for data methods)

## Migration from Python

This TypeScript implementation maintains the same method signatures and functionality as the Python version:
- All methods have been converted with equivalent functionality
- Type safety has been added with comprehensive interfaces
- Error handling follows the same patterns
- API endpoints and request/response structures are identical

## Example: Complete Workflow

```typescript
import { EventsHandler } from 'connector-userid-ts';

async function eventWorkflow() {
  const handler = new EventsHandler({
    userId: 'user123',
    dataUrl: 'api.example.com',
    logTime: true
  });

  try {
    // 1. Get available categories
    const categories = await handler.getEventCategories();
    console.log('Available categories:', categories);

    // 2. Publish an event
    await handler.publishEvent({
      message: 'Deployment completed',
      metaData: JSON.stringify({ version: '2.1.0' }),
      hoverData: 'New version deployed successfully',
      title: 'Deployment',
      eventNamesList: ['Deployment']
    });

    // 3. Retrieve recent events
    const recentEvents = await handler.getEventsInTimeslot({
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime: new Date()
    });
    console.log('Recent events:', recentEvents);

  } catch (error) {
    console.error('Workflow error:', error);
  }
}
```

This completes the conversion of the Python EventsHandler to TypeScript while maintaining full API compatibility and adding comprehensive type safety. 