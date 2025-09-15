import axios from 'axios';

// Device Detail interface to match backend structure
export interface DeviceDetail {
  devID: string;
  devTypeID: string;
}

// API Response interface
export interface ApiResponse<T = any> {
  data: T;
  errors?: string[];
}

// Configuration for the API call
const API_CONFIG = {
  dataUrl: 'datads.iosense.io',
  userId: '6710eea3340f9be7ffa61634',
  protocol: 'https' // Using https for production
};

/**
 * Fetches device details from the IoSense API
 * This function replicates the getDeviceDetails method from the backend DataAccess.ts
 */
export const fetchDeviceDetails = async (): Promise<DeviceDetail[]> => {
  // Construct the URL for the API request
  const url = `${API_CONFIG.protocol}://${API_CONFIG.dataUrl}/api/metaData/allDevices`;
  
  console.log('🔍 Fetching device details from:', url);
  console.log('👤 Using User ID:', API_CONFIG.userId);

  try {
    const response = await axios.get<ApiResponse<DeviceDetail[]>>(url, {
      headers: {
        userID: API_CONFIG.userId,
        'Content-Type': 'application/json'
      },
    });

    console.log('✅ API Response received:', response);
    console.log('📊 Response status:', response.status);
    console.log('📦 Response headers:', response.headers);

    // Check if the response contains the expected data
    if (!response.data || !response.data.data) {
      console.error('❌ Missing "data" in response:', response.data);
      throw new Error('Missing "data" in response');
    }

    const deviceDetails = response.data.data;
    console.log('🎯 Device details fetched successfully:');
    console.log('📱 Total devices found:', deviceDetails.length);
    console.log('🔍 Device details:', deviceDetails);
    
    // Log each device for debugging
    deviceDetails.forEach((device, index) => {
      console.log(`📱 Device ${index + 1}:`, {
        deviceId: device.devID,
        deviceType: device.devTypeID
      });
    });

    return deviceDetails;
  } catch (error: any) {
    // Handle errors that occur during the API request
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const server = error.response?.headers?.server || "Unknown Server";
    const body = error.response?.data || error.message;

    // Log the error details
    console.error('❌ API Error occurred:');
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
 * Transforms device details into dropdown options for the UI
 */
export const transformDeviceDetailsToOptions = (devices: DeviceDetail[]) => {
  const options = devices.map(device => ({
    label: device.devID,
    value: device.devID,
    deviceType: device.devTypeID
  }));

  console.log('🔄 Transformed devices for dropdown:', options);
  return options;
}; 