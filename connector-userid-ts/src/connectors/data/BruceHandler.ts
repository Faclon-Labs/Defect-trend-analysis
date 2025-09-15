import axios, { AxiosResponse } from 'axios';
import {
  FETCH_USER_INSIGHTS_URL,
  GET_SOURCE_INSIGHT_URL,
  FETCH_INSIGHT_RESULTS_URL,
  Protocol,
  VERSION,
  MAX_RETRIES,
  RETRY_DELAY
} from '../../utils/constants.js';
import DataAccess from './DataAccess.js';

// Type definitions for BruceHandler
export interface BruceHandlerConfig {
  userId: string;
  dataUrl: string;
  onPrem?: boolean;
  tz?: string;
}

export interface PopulateConfig {
  path: string;
  select: string;
}

export interface PaginationConfig {
  page: number;
  count: number;
}

export interface FetchUserInsightsOptions {
  pagination?: PaginationConfig;
  populate?: PopulateConfig[];
  sort?: Record<string, number>;
  projection?: string | null;
  onPrem?: boolean;
}

export interface SourceInsightID {
  _id: string;
  tags: string[];
  source: string;
  insightID: string;
  insightProperty: any[];
}

export interface UserInsight {
  _id: string;
  userTags: string[];
  starred: boolean;
  hidden: boolean;
  restrictedAccess: boolean;
  source: string;
  insightID: string;
  insightName: string;
  sourceInsightID: SourceInsightID;
  iconUrl: string;
  added_by: string;
  organisation: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  updated_by: string;
}

export interface FetchUserInsightsResponse {
  success: boolean;
  data: {
    data: UserInsight[];
  };
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data: T;
  errors?: string[];
}

export interface GetSourceInsightOptions {
  insightId: string;
  onPrem?: boolean;
}

export interface VectorConfig {
  _id: string;
  distanceMetric: string;
  modelName: string;
  vectorSize: number;
}

export interface SelectedUser {
  orgName: string;
  user: string;
  email: string;
  userName: string;
}

export interface SourceInsight {
  _id: string;
  organisations: string[];
  restrictedAccess: boolean;
  whitelistedUsers: string[];
  tags: string[];
  users: string[];
  workbenches: string[];
  workbenchTags: string[];
  source: string;
  privilegeUsers: string[];
  insightID: string;
  insightName: string | null;
  note: string;
  insightProperty: any[];
  added_by: string;
  vectorConfig: VectorConfig;
  selectedUsers: SelectedUser[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  updated_by: string;
  firstDataPointTime: string;
  lastDataPointTime: string;
}

export interface GetSourceInsightResponse {
  success: boolean;
  data: SourceInsight;
}

export interface FetchInsightResultsOptions {
  insightId: string;
  filter?: {
    startDate?: string;
    endDate?: string;
    insightProperty?: any[];
    tags?: string[];
  };
  pagination?: PaginationConfig;
  onPrem?: boolean;
}

export interface InsightResultFilter {
  startDate?: string;
  endDate?: string;
  insightProperty?: any[];
  tags?: string[];
}

export interface S3Details {
  bucket: string;
  fileName: string;
  folderName: string;
  contentType: string;
  objectOperation: string;
  fileSize?: number;
}

export interface ChunkMetadata {
  chunkSize: number;
  chunkOverlap: number;
}

export interface InsightResultMetadata {
  s3Details?: S3Details;
  dataSource: any[];
  filetype?: string;
  s3_url?: string;
  instructions?: string;
  documentID?: string;
  mode?: string[];
  chunkMetadata?: ChunkMetadata;
  language?: string;
  status?: string;
}

export interface ApplicationID {
  _id: string;
  workbenchName: string;
}

export interface InsightResult {
  _id: string;
  tags: string[];
  metadata: InsightResultMetadata;
  added_by: string;
  applicationType: string;
  insightID: string;
  insightProperty: any[];
  invocationTime: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  applicationID?: ApplicationID;
  resultName?: string;
}

export interface InsightResultsPagination {
  page: number;
  count: number;
  totalPages: number;
}

export interface FetchInsightResultsResponse {
  success: boolean;
  data: {
    data: InsightResult[];
    totalCount: number;
    pagination: InsightResultsPagination;
  };
}

export default class BruceHandler {
  private userId: string;
  private dataUrl: string;
  private onPrem: boolean;
  private tz: string;
  public readonly version: string = VERSION;

  constructor({
    userId,
    dataUrl,
    onPrem = false,
    tz = 'UTC'
  }: BruceHandlerConfig) {
    /**
     * A class to handle Bruce-related operations for user insights and analytics.
     * 
     * @param userId - The user ID used for authentication and identification in requests
     * @param dataUrl - The URL or IP address of the server from which Bruce data is retrieved
     * @param onPrem - A flag indicating whether to use the on-premises server. If true, uses HTTP; otherwise, uses HTTPS
     * @param tz - The timezone to use for time-related operations. Defaults to UTC if not provided
     */
    this.userId = userId;
    this.dataUrl = dataUrl;
    this.onPrem = onPrem;
    this.tz = tz;
  }

  private errorMessage(response: AxiosResponse | undefined, url: string): string {
    if (!response) {
      return `\n[URL] ${url}\n[EXCEPTION] No response received`;
    }
    return `\n[STATUS CODE] ${response.status}\n[URL] ${url}\n[SERVER INFO] ${response.headers.server || 'Unknown Server'}\n[RESPONSE] ${response.data}`;
  }

  private formatUrl(template: string, onPrem?: boolean): string {
    const protocol = (onPrem ?? this.onPrem) ? Protocol.HTTP : Protocol.HTTPS;
    return template.replace('{protocol}', protocol).replace('{data_url}', this.dataUrl);
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchUserInsights(options: FetchUserInsightsOptions = {}): Promise<UserInsight[]> {
    /**
     * Fetches paginated user insights with customizable filters and population options.
     * 
     * This method retrieves user insights from the Bruce API with support for pagination,
     * field population, sorting, and projection. It's designed to handle large datasets
     * efficiently through pagination and provides detailed insight information including
     * metadata, source details, and user permissions.
     * 
     * @param options - Configuration options for fetching user insights
     * @param options.pagination - Pagination settings (default: {page: 1, count: 1000})
     * @param options.populate - Array of population configurations to include related data
     * @param options.sort - Sort configuration object (default: {"createdAt": -1})
     * @param options.projection - Fields to include/exclude in response (null for all fields)
     * @param options.onPrem - Override for on-premises server usage
     * 
     * @returns Array of user insight objects containing:
     *   - _id: Unique identifier for the insight
     *   - userTags: Array of user-defined tags
     *   - starred: Boolean indicating if insight is starred by user
     *   - hidden: Boolean indicating if insight is hidden from user
     *   - restrictedAccess: Boolean indicating access restrictions
     *   - source: Source system identifier (e.g., "qdrant")
     *   - insightID: Unique insight identifier
     *   - insightName: Human-readable name of the insight
     *   - sourceInsightID: Object containing source-specific insight details
     *   - iconUrl: URL to the insight's icon image
     *   - added_by: User ID who added the insight
     *   - organisation: Organisation ID associated with the insight
     *   - createdAt: ISO timestamp of creation
     *   - updatedAt: ISO timestamp of last update
     *   - updated_by: User ID who last updated the insight
     * 
     * @throws Error if the API request fails or returns unsuccessful response
     */
    const {
      pagination = { page: 1, count: 1000 },
      populate = [
        {
          path: "sourceInsightID",
          select: "insightID insightProperty tags source"
        }
      ],
      sort = { "createdAt": -1 },
      projection = null,
      onPrem
    } = options;

    const url = this.formatUrl(FETCH_USER_INSIGHTS_URL, onPrem);
    
    const payload = {
      pagination,
      populate,
      sort,
      projection,
      user: {
        id: this.userId
      }
    };

    const headers = {
      'userID': this.userId,
      'Content-Type': 'application/json'
    };

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const response: AxiosResponse<FetchUserInsightsResponse> = await axios.put(url, payload, { headers });
        
        if (response.data.success && response.data.data && response.data.data.data) {
          return response.data.data.data;
        } else {
          throw new Error(`API returned unsuccessful response: ${JSON.stringify(response.data)}`);
        }
      } catch (error: any) {
        retries++;
        if (retries >= MAX_RETRIES) {
          const errorMsg = this.errorMessage(error.response, url);
          throw new Error(`Failed to fetch user insights after ${MAX_RETRIES} retries. ${errorMsg}`);
        }
        
        // Exponential backoff
        const delay = RETRY_DELAY[0] * Math.pow(2, retries - 1) * 1000;
        await this._sleep(delay);
      }
    }

    return [];
  }

  async getSourceInsight(options: GetSourceInsightOptions): Promise<SourceInsight> {
    /**
     * Retrieves detailed information about a specific source insight by its ID.
     * 
     * This method fetches comprehensive metadata and configuration details for a source insight,
     * including organizational access permissions, user privileges, workbench associations,
     * vector configurations, and temporal data boundaries. It automatically retrieves the
     * user's organization information to authorize the request.
     * 
     * The method first calls the DataAccess API to obtain the user's organization ID, then
     * uses this information to fetch the source insight details. This ensures proper
     * authorization and access control for the requested insight.
     * 
     * @param options - Configuration options for fetching source insight
     * @param options.insightId - The unique identifier of the insight to retrieve (e.g., "INS_e5fad5d8b198")
     * @param options.onPrem - Override for on-premises server usage
     * 
     * @returns Promise<SourceInsight> - Detailed source insight object containing:
     *   - _id: Unique database identifier for the insight
     *   - organisations: Array of organization IDs with access to this insight
     *   - restrictedAccess: Boolean indicating if access is restricted
     *   - whitelistedUsers: Array of user IDs with explicit access permissions
     *   - tags: Array of descriptive tags associated with the insight
     *   - users: Array of user IDs who have access to this insight
     *   - workbenches: Array of workbench IDs where this insight is available
     *   - workbenchTags: Array of tags associated with workbenches using this insight
     *   - source: Source system identifier (e.g., "qdrant", "s3")
     *   - privilegeUsers: Array of user IDs with elevated privileges
     *   - insightID: Human-readable insight identifier
     *   - insightName: Display name of the insight (can be null)
     *   - note: Descriptive note explaining the insight's purpose and content
     *   - insightProperty: Array of additional properties and configurations
     *   - vectorConfig: Configuration object for vector database settings including:
     *     - distanceMetric: Algorithm used for vector similarity calculations
     *     - modelName: Embedding model used for vectorization
     *     - vectorSize: Dimensionality of the vector embeddings
     *   - selectedUsers: Array of user objects with detailed information:
     *     - orgName: Organization name
     *     - user: User ID
     *     - email: User email address
     *     - userName: Display name of the user
     *   - createdAt: ISO timestamp when the insight was created
     *   - updatedAt: ISO timestamp when the insight was last modified
     *   - added_by: User ID who created the insight
     *   - updated_by: User ID who last modified the insight
     *   - firstDataPointTime: ISO timestamp of the earliest data point in the insight
     *   - lastDataPointTime: ISO timestamp of the most recent data point in the insight
     * 
     * @throws Error if the user information cannot be retrieved or the API request fails
     * @throws Error if the insight ID is not found or access is denied
     * @throws Error if the organization information is missing from user data
     */
    const { insightId, onPrem } = options;

    // First, get user information to obtain organization ID
    const dataAccess = new DataAccess({
      userId: this.userId,
      dataUrl: this.dataUrl,
      dsUrl: this.dataUrl, // Using same URL for ds operations
      onPrem: onPrem ?? this.onPrem,
      tz: this.tz
    });

    let organisationId: string;
    try {
      const userInfo = await dataAccess.getUserInfo(onPrem);
      if (!userInfo || typeof userInfo !== 'object' || !('organisation' in userInfo)) {
        throw new Error('Failed to retrieve user organization information');
      }
      
      const organisation = (userInfo as any).organisation;
      if (!organisation || !organisation._id) {
        throw new Error('Organization ID not found in user information');
      }
      
      organisationId = organisation._id;
    } catch (error: any) {
      throw new Error(`Failed to get user organization: ${error.message}`);
    }

    // Now fetch the source insight using the organization ID
    const url = this.formatUrl(GET_SOURCE_INSIGHT_URL, onPrem)
      .replace('{insight_id}', insightId);
    
    const payload = {
      user: {
        organisation: organisationId
      }
    };

    const headers = {
      'userID': this.userId,
      'Content-Type': 'application/json'
    };

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const response: AxiosResponse<GetSourceInsightResponse> = await axios.put(url, payload, { headers });
        
        if (response.data.success && response.data.data) {
          return response.data.data;
        } else {
          throw new Error(`API returned unsuccessful response: ${JSON.stringify(response.data)}`);
        }
      } catch (error: any) {
        retries++;
        if (retries >= MAX_RETRIES) {
          const errorMsg = this.errorMessage(error.response, url);
          throw new Error(`Failed to fetch source insight after ${MAX_RETRIES} retries. ${errorMsg}`);
        }
        
        // Exponential backoff
        const delay = RETRY_DELAY[0] * Math.pow(2, retries - 1) * 1000;
        await this._sleep(delay);
      }
    }

    throw new Error('Failed to fetch source insight: Maximum retries exceeded');
  }

  private convertToUtc(time: string | Date, timezone: string = 'UTC'): string {
    /**
     * Converts a given time from the specified timezone to UTC ISO string.
     * 
     * @param time - The time to convert (ISO string or Date object)
     * @param timezone - The timezone of the input time (e.g., 'Asia/Kolkata', 'America/New_York')
     * @returns ISO string in UTC
     */
    if (!time) return new Date().toISOString();
    
    let dateTime: Date;
    if (typeof time === 'string') {
      dateTime = new Date(time);
    } else {
      dateTime = time;
    }

    // If the date is invalid, throw an error
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid date format: ${time}`);
    }

    // If timezone is UTC, return as is
    if (timezone === 'UTC') {
      return dateTime.toISOString();
    }

    // For other timezones, we need to handle the conversion
    // Note: This assumes the input time is in the specified timezone
    // and we need to convert it to UTC
    try {
      // Create a date string that represents the time in the specified timezone
      const timeInTimezone = dateTime.toLocaleString('en-US', { timeZone: timezone });
      const timeInUtc = dateTime.toLocaleString('en-US', { timeZone: 'UTC' });
      
      // Calculate the offset between the timezone and UTC
      const timezoneDate = new Date(timeInTimezone);
      const utcDate = new Date(timeInUtc);
      const offset = utcDate.getTime() - timezoneDate.getTime();
      
      // Apply the offset to get the correct UTC time
      const correctedUtcTime = new Date(dateTime.getTime() + offset);
      return correctedUtcTime.toISOString();
    } catch (error) {
      // Fallback to treating the input as already in UTC
      console.warn(`Timezone conversion failed for ${timezone}, treating time as UTC:`, error);
      return dateTime.toISOString();
    }
  }

  async fetchInsightResults(options: FetchInsightResultsOptions): Promise<{
    results: InsightResult[];
    totalCount: number;
    pagination: InsightResultsPagination;
  }> {
    /**
     * Fetches paginated insight results for a specific insight ID with customizable filtering options.
     * 
     * This method retrieves processed insight results from the Bruce system, including generated
     * documents, analysis outputs, and processed data artifacts. It supports filtering by date range,
     * insight properties, and tags, with full pagination support for handling large result sets efficiently.
     * 
     * The method automatically handles user authentication and organization context by retrieving
     * the user's organization information via DataAccess, ensuring proper access control and
     * authorization for the requested insight results.
     * 
     * **Timezone Handling:**
     * The startDate and endDate in the filter are automatically converted from the user's local
     * timezone (specified in the constructor) to UTC before sending to the API. This ensures
     * consistent querying regardless of the user's location. For example, if you specify
     * "2025-06-01T10:00:00" and your timezone is "Asia/Kolkata", it will be converted to the
     * equivalent UTC time before querying.
     * 
     * **Tag Filtering:**
     * The tags filter allows you to retrieve only results that have specific tags associated with them.
     * For example, specifying tags: ["Profile", "OEE"] will return only results that contain at least
     * one of these tags. This is useful for categorizing and filtering results based on their content
     * or processing type.
     * 
     * Results can include various types of outputs such as PDF documents, processed data files,
     * analysis reports, and other artifacts generated by the insight processing pipeline. Each
     * result contains comprehensive metadata including S3 storage details, processing parameters,
     * and execution context.
     * 
     * @param options - Configuration options for fetching insight results
     * @param options.insightId - The unique identifier of the insight to fetch results for (e.g., "INS_d8c4dfe45543")
     * @param options.filter - Optional filtering criteria for results
     * @param options.filter.startDate - ISO timestamp in user's local timezone to filter results from this date onwards (will be converted to UTC)
     * @param options.filter.endDate - ISO timestamp in user's local timezone to filter results up to this date (will be converted to UTC)
     * @param options.filter.insightProperty - Array of insight property filters to apply
     * @param options.filter.tags - Array of tags to filter results by (e.g., ["Profile", "OEE", "Normal"])
     * @param options.pagination - Pagination settings (defaults to {page: 1, count: 50})
     * @param options.onPrem - Override for on-premises server usage
     * 
     * @returns Promise<Object> - Object containing:
     *   - results: Array of InsightResult objects, each containing:
     *     - _id: Unique identifier for the result record
     *     - tags: Array of descriptive tags associated with the result
     *     - metadata: Comprehensive metadata object containing:
     *       - s3Details: S3 storage information (bucket, fileName, folderName, contentType, fileSize)
     *       - dataSource: Array of data sources used in processing
     *       - filetype: Type of generated file (e.g., "pdf", "image")
     *       - s3_url: Direct URL to the stored result file
     *       - instructions: Processing instructions used for generation
     *       - documentID: Unique document identifier for tracking
     *       - mode: Array of processing modes applied (e.g., ["text", "image", "table"])
     *       - chunkMetadata: Chunking configuration (chunkSize, chunkOverlap)
     *       - language: Language used for processing (e.g., "English")
     *       - status: Current processing status (e.g., "completed")
     *     - insightID: Parent insight identifier
     *     - applicationType: Type of application that generated the result
     *     - resultName: Human-readable name of the generated result
     *     - applicationID: Workbench information where result was generated
     *     - insightProperty: Array of applied insight properties
     *     - invocationTime: ISO timestamp when processing was initiated
     *     - createdAt: ISO timestamp when result record was created
     *     - updatedAt: ISO timestamp when result record was last modified
     *     - added_by: User ID who initiated the result generation
     *   - totalCount: Total number of available results matching the criteria
     *   - pagination: Pagination metadata object containing:
     *     - page: Current page number
     *     - count: Number of results in current page
     *     - totalPages: Total number of available pages
     * 
     * @throws Error if the user information cannot be retrieved or organization ID is missing
     * @throws Error if the insight ID is not found or access is denied
     * @throws Error if the API request fails after maximum retries
     * @throws Error if the response format is invalid or unsuccessful
     * @throws Error if the provided date format is invalid
     */
    const { insightId, filter, pagination = { page: 1, count: 50 }, onPrem } = options;

    // First, get user information to obtain organization ID
    const dataAccess = new DataAccess({
      userId: this.userId,
      dataUrl: this.dataUrl,
      dsUrl: this.dataUrl,
      onPrem: onPrem ?? this.onPrem,
      tz: this.tz
    });

    let organisationId: string;
    try {
      const userInfo = await dataAccess.getUserInfo(onPrem);
      if (!userInfo || typeof userInfo !== 'object' || !('organisation' in userInfo)) {
        throw new Error('Failed to retrieve user organization information');
      }
      
      const organisation = (userInfo as any).organisation;
      if (!organisation || !organisation._id) {
        throw new Error('Organization ID not found in user information');
      }
      
      organisationId = organisation._id;
    } catch (error: any) {
      throw new Error(`Failed to get user organization: ${error.message}`);
    }

    // Convert filter dates from user's timezone to UTC and include tags
    let convertedFilter = filter;
    if (filter && (filter.startDate || filter.endDate || filter.tags)) {
      convertedFilter = {
        ...filter,
        startDate: filter.startDate ? this.convertToUtc(filter.startDate, this.tz) : undefined,
        endDate: filter.endDate ? this.convertToUtc(filter.endDate, this.tz) : undefined,
        insightProperty: filter.insightProperty || [],
        tags: filter.tags || undefined
      };
    }

    // Prepare the request
    const url = this.formatUrl(FETCH_INSIGHT_RESULTS_URL, onPrem)
      .replace('{insight_id}', insightId);
    
    const payload = {
      filter: convertedFilter || {
        startDate: undefined,
        endDate: undefined,
        insightProperty: [],
        tags: undefined
      },
      user: {
        id: this.userId,
        organisation: organisationId
      },
      pagination
    };

    const headers = {
      'userID': this.userId,
      'Content-Type': 'application/json'
    };

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const response: AxiosResponse<FetchInsightResultsResponse> = await axios.put(url, payload, { headers });
        
        if (response.data.success && response.data.data) {
          return {
            results: response.data.data.data,
            totalCount: response.data.data.totalCount,
            pagination: response.data.data.pagination
          };
        } else {
          throw new Error(`API returned unsuccessful response: ${JSON.stringify(response.data)}`);
        }
      } catch (error: any) {
        retries++;
        if (retries >= MAX_RETRIES) {
          const errorMsg = this.errorMessage(error.response, url);
          throw new Error(`Failed to fetch insight results after ${MAX_RETRIES} retries. ${errorMsg}`);
        }
        
        // Exponential backoff
        const delay = RETRY_DELAY[0] * Math.pow(2, retries - 1) * 1000;
        await this._sleep(delay);
      }
    }

    throw new Error('Failed to fetch insight results: Maximum retries exceeded');
  }
}
