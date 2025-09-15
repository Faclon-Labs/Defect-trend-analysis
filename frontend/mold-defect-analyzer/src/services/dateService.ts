// Date service for handling calendar year quarter calculations

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface QuarterInfo {
  quarter: number;
  year: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Gets the current calendar year quarter information
 */
export const getCurrentQuarter = (year: number = new Date().getFullYear()): QuarterInfo => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, we want 1-12
  
  let quarter: number;
  if (currentMonth >= 1 && currentMonth <= 3) {
    quarter = 1;
  } else if (currentMonth >= 4 && currentMonth <= 6) {
    quarter = 2;
  } else if (currentMonth >= 7 && currentMonth <= 9) {
    quarter = 3;
  } else {
    quarter = 4;
  }
  
  return getQuarterDates(quarter, year);
};

/**
 * Gets the start and end dates for a specific quarter of a year with 08:00 AM cycle time
 */
export const getQuarterDates = (quarter: number, year: number): QuarterInfo => {
  let startMonth: number, endMonth: number, endDay: number;
  
  switch (quarter) {
    case 1: // Q1: January 1 - March 31
      startMonth = 0; // January (0-indexed)
      endMonth = 2;   // March (0-indexed)
      endDay = 31;
      break;
    case 2: // Q2: April 1 - June 30
      startMonth = 3; // April (0-indexed)
      endMonth = 5;   // June (0-indexed)
      endDay = 30;
      break;
    case 3: // Q3: July 1 - September 30
      startMonth = 6; // July (0-indexed)
      endMonth = 8;   // September (0-indexed)
      endDay = 30;
      break;
    case 4: // Q4: October 1 - December 31
      startMonth = 9;  // October (0-indexed)
      endMonth = 11;   // December (0-indexed)
      endDay = 31;
      break;
    default:
      throw new Error(`Invalid quarter: ${quarter}. Must be 1, 2, 3, or 4.`);
  }
  
  // Set start date to 1st day of quarter at 08:00 AM (cycle time)
  const startDate = new Date(year, startMonth, 1, 8, 0, 0, 0);
  
  // Set end date to last day of quarter at 08:00 AM (cycle time)  
  const endDate = new Date(year, endMonth, endDay, 8, 0, 0, 0);
  
  return {
    quarter,
    year,
    startDate,
    endDate
  };
};

/**
 * Gets the previous quarter relative to the current quarter
 */
export const getPreviousQuarter = (year: number = new Date().getFullYear()): QuarterInfo => {
  const currentQuarter = getCurrentQuarter(year);
  
  if (currentQuarter.quarter === 1) {
    // If current is Q1, previous is Q4 of last year
    return getQuarterDates(4, year - 1);
  } else {
    // Otherwise, previous quarter of same year
    return getQuarterDates(currentQuarter.quarter - 1, year);
  }
};

/**
 * Calculates date ranges based on time period selection with 08:00 AM cycle time
 * Timezone: Asia/Calcutta (IST)
 */
export const getDateRangeForTimePeriod = (
  timePeriod: string, 
  customStartDate?: Date | null, 
  customEndDate?: Date | null,
  year: number = new Date().getFullYear()
): DateRange => {
  const now = new Date();
  
  console.log('🗓️ Calculating date range for time period:', timePeriod);
  console.log('📅 Current year:', year);
  console.log('⏰ Current time:', now.toISOString());
  
  switch (timePeriod) {
    case "current-quarter": {
      const currentQuarter = getCurrentQuarter(year);
      
      // For current quarter, end date is today at 08:00 AM or end of quarter at 08:00 AM
      let endDate: Date;
      const todayAt8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
      
      // If today is within the current quarter, use today at 08:00 AM
      if (now >= currentQuarter.startDate && now <= currentQuarter.endDate) {
        endDate = todayAt8AM;
        console.log(`📊 Current Quarter (Q${currentQuarter.quarter}) - ongoing:`, 
          currentQuarter.startDate.toISOString(), 'to', endDate.toISOString());
      } else {
        // Use end of quarter at 08:00 AM
        endDate = currentQuarter.endDate;
        console.log(`📊 Current Quarter (Q${currentQuarter.quarter}) - completed:`, 
          currentQuarter.startDate.toISOString(), 'to', endDate.toISOString());
      }
      
      return {
        startDate: currentQuarter.startDate,
        endDate: endDate,
        label: `Current Quarter (Q${currentQuarter.quarter} ${year})`
      };
    }
    
    case "last-quarter": {
      const lastQuarter = getPreviousQuarter(year);
      console.log(`📊 Last Quarter (Q${lastQuarter.quarter}):`, 
        lastQuarter.startDate.toISOString(), 'to', lastQuarter.endDate.toISOString());
      
      return {
        startDate: lastQuarter.startDate,
        endDate: lastQuarter.endDate,
        label: `Last Quarter (Q${lastQuarter.quarter} ${lastQuarter.year})`
      };
    }
    
    case "q1": {
      const q1 = getQuarterDates(1, year);
      console.log('📊 Q1 (Jan-Mar):', q1.startDate.toISOString(), 'to', q1.endDate.toISOString());
      
      return {
        startDate: q1.startDate,
        endDate: q1.endDate,
        label: `Q1 ${year}`
      };
    }
    
    case "q2": {
      const q2 = getQuarterDates(2, year);
      console.log('📊 Q2 (Apr-Jun):', q2.startDate.toISOString(), 'to', q2.endDate.toISOString());
      
      return {
        startDate: q2.startDate,
        endDate: q2.endDate,
        label: `Q2 ${year}`
      };
    }
    
    case "q3": {
      const q3 = getQuarterDates(3, year);
      console.log('📊 Q3 (Jul-Sep):', q3.startDate.toISOString(), 'to', q3.endDate.toISOString());
      
      return {
        startDate: q3.startDate,
        endDate: q3.endDate,
        label: `Q3 ${year}`
      };
    }
    
    case "q4": {
      const q4 = getQuarterDates(4, year);
      console.log('📊 Q4 (Oct-Dec):', q4.startDate.toISOString(), 'to', q4.endDate.toISOString());
      
      return {
        startDate: q4.startDate,
        endDate: q4.endDate,
        label: `Q4 ${year}`
      };
    }
    
    case "custom": {
      // Set custom dates to 08:00 AM cycle time
      let startDate: Date, endDate: Date;
      
      if (customStartDate) {
        startDate = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate(), 8, 0, 0, 0);
      } else {
        startDate = new Date(year, 0, 1, 8, 0, 0, 0); // Default to start of year at 08:00 AM
      }
      
      if (customEndDate) {
        endDate = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 8, 0, 0, 0);
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0); // Default to today at 08:00 AM
      }
      
      console.log('📊 Custom Range (08:00 AM cycle):', startDate.toISOString(), 'to', endDate.toISOString());
      
      return {
        startDate,
        endDate,
        label: `Custom (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
      };
    }
    
    default: {
      // Default to current quarter
      const currentQuarter = getCurrentQuarter(year);
      console.log('⚠️ Unknown time period, defaulting to current quarter');
      
      return {
        startDate: currentQuarter.startDate,
        endDate: now,
        label: `Current Quarter (Q${currentQuarter.quarter} ${year})`
      };
    }
  }
};

/**
 * Formats a date range for display purposes
 */
export const formatDateRange = (dateRange: DateRange): string => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  const startStr = dateRange.startDate.toLocaleDateString('en-US', options);
  const endStr = dateRange.endDate.toLocaleDateString('en-US', options);
  
  return `${startStr} - ${endStr}`;
};

/**
 * Gets the current quarter number (1-4)
 */
export const getCurrentQuarterNumber = (): number => {
  const now = new Date();
  const month = now.getMonth() + 1;
  
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}; 