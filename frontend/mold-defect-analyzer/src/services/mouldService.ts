import axios from 'axios';

// Configuration for the API call
const API_CONFIG = {
  dataUrl: 'datads.iosense.io',
  userId: '6710eea3340f9be7ffa61634',
  protocol: 'https' // Using https for production
};

// Interface for MongoDB data response
export interface MongoDataRow {
  _id: string;
  devID: string;
  data: {
    [key: string]: any;
    D0?: string; // The D0 column we're interested in
  };
}

// API Response interface
export interface ApiResponse<T = any> {
  data: T;
  errors?: string[];
  success?: boolean;
}

/**
 * Fetches mould data from the MongoDB endpoint
 * This function replicates the getMongoData method from MachineTimeline.ts
 * Specifically fetches data for devID=SDPLYPLC_AM2_MoldMapping and extracts D0 column values
 */
export const fetchMouldData = async (): Promise<string[]> => {
  // Construct the URL for the API request
  const url = `${API_CONFIG.protocol}://${API_CONFIG.dataUrl}/api/table/getRows3`;
  
  // Payload for the MongoDB query
  const payload = {
    devID: 'SDPLYPLC_AM2_MoldMapping',
    limit: 1000, // Get a reasonable amount of recent data
    rawData: true
  };
  
  console.log('🔍 Fetching mould data from MongoDB:', url);
  console.log('👤 Using User ID:', API_CONFIG.userId);
  console.log('📊 Query payload:', payload);

  try {
    const response = await axios.put<ApiResponse<MongoDataRow[]>>(url, payload, {
      headers: {
        userID: API_CONFIG.userId,
        'Content-Type': 'application/json'
      },
    });

    console.log('✅ MongoDB API Response received:', response);
    console.log('📊 Response status:', response.status);
    console.log('📦 Response headers:', response.headers);

    // Check if the response contains the expected data
    if (!response.data || !response.data.data) {
      console.error('❌ Missing "data" in response:', response.data);
      throw new Error('Missing "data" in response');
    }

    const mongoRows = response.data.data;
    console.log('🎯 MongoDB rows fetched successfully:');
    console.log('📱 Total rows found:', mongoRows.length);
    console.log('🔍 First few rows:', mongoRows.slice(0, 3));

    // Extract unique D0 values from the data
    const d0Values = new Set<string>();
    
    mongoRows.forEach((row, index) => {
      if (row.data && row.data.D0) {
        const d0Value = String(row.data.D0).trim();
        if (d0Value && d0Value !== 'null' && d0Value !== 'undefined' && d0Value !== '') {
          d0Values.add(d0Value);
          console.log(`📝 Row ${index + 1} D0 value:`, d0Value);
        }
      }
    });

    const uniqueMoulds = Array.from(d0Values).sort();
    console.log('✅ Unique mould values extracted from D0 column:');
    console.log('🎯 Total unique moulds found:', uniqueMoulds.length);
    console.log('📋 Mould list:', uniqueMoulds);

    return uniqueMoulds;
  } catch (error: any) {
    // Handle errors that occur during the API request
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const server = error.response?.headers?.server || "Unknown Server";
    const body = error.response?.data || error.message;

    // Log the error details
    console.error('❌ MongoDB API Error occurred:');
    console.error(`🚨 Error name: ${error.name}`);
    console.error(`🔢 Status code: ${status}`);
    console.error(`📍 URL: ${url}`);
    console.error(`🖥️ Server info: ${server}`);
    console.error(`📝 Response body:`, body);
    console.error(`📋 Full error:`, error);

    // Return empty array on error to prevent app crash
    return [];
  }
};

/**
 * Transforms mould data into dropdown options for the UI
 */
export const transformMouldDataToOptions = (moulds: string[]) => {
  const options = moulds.map(mould => ({
    label: mould,
    value: mould
  }));

  console.log('🔄 Transformed moulds for dropdown:', options);
  return options;
}; 