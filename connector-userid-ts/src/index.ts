// Main entry point for connector-userid-ts module
export { default as EventsHandler } from './connectors/data/EventsHandler.js';
export { default as MachineTimeline } from './connectors/data/MachineTimeline.js';
export { MqttConnector } from './connectors/pubsub/mqttHandler.js';
export { default as BruceHandler } from './connectors/data/BruceHandler.js';
export { default as DataAccess } from './connectors/data/DataAccess.js';

// Export all types and interfaces
export type {
  DataAccessConfig,
  ApiResponse,
  DeviceDetail,
  SensorInfo,
  DeviceMetadata,
  UserInfo,
  SensorDataPoint,
  RawSensorData,
  CursorInfo,
  GetFirstDpOptions,
  GetDpOptions,
  CleanedTableOptions,
  DataQueryOptions,
  InfluxDbOptions,
  CursorData,
  GetLoadEntitiesOptions,
  LoadEntity,
  LoadEntitiesResponse
} from './connectors/data/DataAccess.js';

export type {
  EventsHandlerConfig,
  PublishEventOptions,
  EventsInTimeslotOptions,
  EventDataCountOptions,
  DetailedEventOptions,
  MaintenanceModuleDataOptions,
  DeviceDataOptions,
  SensorRowsOptions,
  EventCategory
} from './connectors/data/EventsHandler.js';

export type {
  MachineTimelineConfig,
  MongoDataOptions,
  CreateMongoRowsOptions
} from './connectors/data/MachineTimeline.js';

export type {
  BruceHandlerConfig,
  PopulateConfig,
  PaginationConfig,
  FetchUserInsightsOptions,
  GetSourceInsightOptions,
  FetchInsightResultsOptions,
  SourceInsightID,
  UserInsight,
  FetchUserInsightsResponse,
  VectorConfig,
  SelectedUser,
  SourceInsight,
  GetSourceInsightResponse,
  InsightResultFilter,
  S3Details,
  ChunkMetadata,
  InsightResultMetadata,
  ApplicationID,
  InsightResult,
  InsightResultsPagination,
  FetchInsightResultsResponse
} from './connectors/data/BruceHandler.js';

// Export constants and utilities
export * from './utils/constants.js'; 