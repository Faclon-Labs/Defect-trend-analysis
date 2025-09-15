
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Search, TrendingUp, AlertTriangle, Clock, Gauge, Target, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Legend } from "recharts";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { NoDataScreen } from "@/components/NoDataScreen";
import { fetchDeviceDetails, transformDeviceDetailsToOptions, DeviceDetail } from "@/services/deviceService";
import { fetchMouldData, transformMouldDataToOptions } from "@/services/mouldService";
import { getDateRangeForTimePeriod, formatDateRange, DateRange, getCurrentQuarterNumber } from "@/services/dateService";
import { calculateKPIs, KPIResult, calculateMonthlyDefectRateData, MonthlyDefectRateData, calculateDefectReasonBreakdown, DefectReasonData, calculateProductionVsTargetData, ProductionVsTargetData } from "@/services/kpiService";

// Hardcoded machines list as specified
const hardcodedMachines = [
  "SDPLYPLC_A1_Timeline",
  "SDPLYPLC_A2_Timeline", 
  "SDPLYPLC_A5_Timeline",
  "SDPLYPLC_A9_Timeline",
  "SDPLYPLC_A3_Timeline",
  "SDPLYPLC_A7_Timeline",
  "SDPLYPLC_A8_Timeline",
  "SDPLYPLC_A10_Timeline",
  "SDPLYPLC_A12_Timeline",
  "SDPLYPLC_A4_Timeline",
  "SDPLYPLC_A11_Timeline",
  "SDPLYPLC_A6_Timeline"
];

// Fallback static moulds data in case API fails
const fallbackMoulds = [
  "PP TRAY NEW", "GPPS TRAY 275 NEW", "INNER LID", "RO PP BULB COVER",
  "ICE TRAY TWIN 02 N", "FREEZER DOOR BACK NEW", "275 COVER NEW",
  "STICKER TRAY NEW", "STICKER TRAY OLD", "FRONT FAGIA", "TRIM HIPS NEW",
  "RO PP TRAY NEW", "CHILLER TRAY OLD", "LINNER TRIM NEW (BIG)",
  "SELF STICKER BOTTOL OLD", "FREEZER DOOR BACK 215 TWIN"
];

const rejectionReasons = [
  "Short Molding", "Shrink Mark /Sink Mark", "Silver Mark", "Mixing",
  "Deep Weld Line", "Crack /Broken", "Spray Mark", "Pin Mark",
  "Black Spot", "Colour Variation", "Burn Mark / Flow Mark",
  "White Stress Mark", "Scratches", "Air Bubles"
];

const timeperiods = [
  { value: "current-quarter", label: "Current Quarter" },
  { value: "last-quarter", label: "Last Quarter" },
  { value: "q1", label: "Q1" },
  { value: "q2", label: "Q2" },
  { value: "q3", label: "Q3" },
  { value: "q4", label: "Q4" },
  { value: "custom", label: "Custom" }
];

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showNoData, setShowNoData] = useState(false);
  const [filters, setFilters] = useState({
    plant: "sood",
    machine: hardcodedMachines[0], // Use first machine from hardcoded list
    mould: "PP TRAY NEW",
    timePeriod: "current-quarter",
    customStartDate: null as Date | null,
    customEndDate: null as Date | null
  });
  const [machineSearch, setMachineSearch] = useState("");
  const [mouldSearch, setMouldSearch] = useState("");
  
  // State for API-fetched moulds (machines are now hardcoded)
  const [machines] = useState<string[]>(hardcodedMachines); // Hardcoded machines, no need for API
  const [moulds, setMoulds] = useState<string[]>(fallbackMoulds);
  const [isLoadingMoulds, setIsLoadingMoulds] = useState(false);
  
  // State for calculated date range
  const [currentDateRange, setCurrentDateRange] = useState<DateRange | null>(null);
  
  // State for KPI calculations
  const [kpiData, setKpiData] = useState<KPIResult | null>(null);
  const [isLoadingKPI, setIsLoadingKPI] = useState(false);
  
  // State for monthly defect rate chart data
  const [monthlyDefectRateData, setMonthlyDefectRateData] = useState<MonthlyDefectRateData[]>([]);
  const [isLoadingMonthlyChart, setIsLoadingMonthlyChart] = useState(false);
  
  // State for defect reason breakdown data
  const [defectReasonData, setDefectReasonData] = useState<DefectReasonData[]>([]);
  const [isLoadingDefectReason, setIsLoadingDefectReason] = useState(false);
  
  // State for production vs target data
  const [productionVsTargetData, setProductionVsTargetData] = useState<ProductionVsTargetData[]>([]);
  const [isLoadingProductionVsTarget, setIsLoadingProductionVsTarget] = useState(false);
  
  // Test data for different time periods (2025)
  const generateTestMonthlyData = (): MonthlyDefectRateData[] => {
    switch (filters.timePeriod) {
      case "current-quarter": // Q3: Jul-Sep 2025
        return [
          { month: "Jul 2025", unitsProduced: 2450, defectUnits: 89, defectRate: 3.63 },
          { month: "Aug 2025", unitsProduced: 2680, defectUnits: 95, defectRate: 3.54 },
          { month: "Sep 2025", unitsProduced: 2340, defectUnits: 78, defectRate: 3.33 }
        ];
      case "last-quarter": // Q2: Apr-Jun 2025  
        return [
          { month: "Apr 2025", unitsProduced: 2150, defectUnits: 76, defectRate: 3.53 },
          { month: "May 2025", unitsProduced: 2390, defectUnits: 88, defectRate: 3.68 },
          { month: "Jun 2025", unitsProduced: 2220, defectUnits: 82, defectRate: 3.69 }
        ];
      case "q1": // Q1: Jan-Mar 2025
        return [
          { month: "Jan 2025", unitsProduced: 1950, defectUnits: 68, defectRate: 3.49 },
          { month: "Feb 2025", unitsProduced: 1780, defectUnits: 62, defectRate: 3.48 },
          { month: "Mar 2025", unitsProduced: 2120, defectUnits: 75, defectRate: 3.54 }
        ];
      case "q2": // Q2: Apr-Jun 2025
        return [
          { month: "Apr 2025", unitsProduced: 2150, defectUnits: 76, defectRate: 3.53 },
          { month: "May 2025", unitsProduced: 2390, defectUnits: 88, defectRate: 3.68 },
          { month: "Jun 2025", unitsProduced: 2220, defectUnits: 82, defectRate: 3.69 }
        ];
      case "q3": // Q3: Jul-Sep 2025
        return [
          { month: "Jul 2025", unitsProduced: 2450, defectUnits: 89, defectRate: 3.63 },
          { month: "Aug 2025", unitsProduced: 2680, defectUnits: 95, defectRate: 3.54 },
          { month: "Sep 2025", unitsProduced: 2340, defectUnits: 78, defectRate: 3.33 }
        ];
      case "q4": // Q4: Oct-Dec 2025
        return [
          { month: "Oct 2025", unitsProduced: 2380, defectUnits: 85, defectRate: 3.57 },
          { month: "Nov 2025", unitsProduced: 2150, defectUnits: 79, defectRate: 3.67 },
          { month: "Dec 2025", unitsProduced: 1980, defectUnits: 71, defectRate: 3.59 }
        ];
      default:
        return [];
    }
  };
  
  // Machines are now hardcoded, no need to fetch from API
  console.log('📋 Using hardcoded machines:', hardcodedMachines);
  
  // Fetch mould details from MongoDB API on component mount
  useEffect(() => {
    const loadMoulds = async () => {
      setIsLoadingMoulds(true);
      console.log('🚀 Starting mould fetch process...');
      
      try {
        const mouldData = await fetchMouldData();
        
        if (mouldData.length > 0) {
          setMoulds(mouldData);
          console.log('✅ Successfully loaded moulds:', mouldData);
          
          // Update the default selected mould if available
          if (mouldData.length > 0) {
            setFilters(prev => ({
              ...prev,
              mould: mouldData[0]
            }));
          }
        } else {
          console.log('⚠️ No moulds found, using fallback moulds');
          setMoulds(fallbackMoulds);
        }
      } catch (error) {
        console.error('❌ Failed to load moulds:', error);
        setMoulds(fallbackMoulds);
      } finally {
        setIsLoadingMoulds(false);
      }
    };
    
    loadMoulds();
  }, []);
  
  // Calculate date range when time period or custom dates change
  useEffect(() => {
    console.log('🗓️ Recalculating date range for:', filters.timePeriod);
    
    const dateRange = getDateRangeForTimePeriod(
      filters.timePeriod,
      filters.customStartDate,
      filters.customEndDate,
      2025 // Using 2025 as the calendar year for your specific requirement
    );
    
    setCurrentDateRange(dateRange);
    console.log('📅 Updated date range:', formatDateRange(dateRange));
  }, [filters.timePeriod, filters.customStartDate, filters.customEndDate]);
  
  // Calculate KPI when machine, mould, or date range changes
  useEffect(() => {
    const calculateKPI = async () => {
      if (!currentDateRange || !filters.machine || !filters.mould) {
        console.log('⏳ Skipping KPI calculation - missing requirements:', {
          dateRange: !!currentDateRange,
          machine: !!filters.machine,
          mould: !!filters.mould
        });
        return;
      }

      setIsLoadingKPI(true);
      console.log('🔢 Starting KPI calculation with filters:', {
        machine: filters.machine,
        mould: filters.mould,
        dateRange: formatDateRange(currentDateRange)
      });

      try {
        const result = await calculateKPIs(
          filters.machine,
          filters.mould,
          currentDateRange
        );
        
        setKpiData(result);
        console.log('✅ KPI calculation completed:', result);
      } catch (error) {
        console.error('❌ KPI calculation failed:', error);
        setKpiData(null);
      } finally {
        setIsLoadingKPI(false);
      }
    };

    // Add a small delay to avoid too frequent API calls
    const timeoutId = setTimeout(calculateKPI, 1000);
    return () => clearTimeout(timeoutId);
  }, [filters.machine, filters.mould, currentDateRange]);

  // Calculate monthly defect rate data when machine, mould, or date range changes
  useEffect(() => {
    const calculateMonthlyChart = async () => {
      if (!currentDateRange || !filters.machine || !filters.mould) {
        console.log('⏳ Skipping monthly chart calculation - missing requirements:', {
          dateRange: !!currentDateRange,
          machine: !!filters.machine,
          mould: !!filters.mould
        });
        return;
      }

      setIsLoadingMonthlyChart(true);
      console.log('📊 Starting monthly chart calculation with filters:', {
        machine: filters.machine,
        mould: filters.mould,
        dateRange: formatDateRange(currentDateRange)
      });

      try {
        const result = await calculateMonthlyDefectRateData(
          filters.machine,
          filters.mould,
          currentDateRange
        );
        
        if (result && result.length > 0) {
          setMonthlyDefectRateData(result);
          console.log('✅ Monthly chart calculation completed:', result);
          console.log('📊 Chart Data Preview:', result.slice(0, 3));
          console.log('📊 Total months with data:', result.length);
        } else {
          console.warn('⚠️ No monthly chart data returned from API - using test data fallback');
          const testData = generateTestMonthlyData();
          setMonthlyDefectRateData(testData);
          console.log('🔄 Using test data as fallback:', testData);
        }
      } catch (error) {
        console.error('❌ Monthly chart test data generation failed:', error);
        
        // Fallback to empty data
        console.log('🔄 Using empty data as final fallback');
        setMonthlyDefectRateData([]);
      } finally {
        setIsLoadingMonthlyChart(false);
      }
    };

    // Add a small delay to avoid too frequent API calls
    const timeoutId = setTimeout(calculateMonthlyChart, 1200);
    return () => clearTimeout(timeoutId);
  }, [filters.machine, filters.mould, currentDateRange]);

  // Fetch defect reason breakdown when machine, mould, or date range changes
  useEffect(() => {
    const fetchDefectReasonBreakdown = async () => {
      if (!currentDateRange || !filters.machine || !filters.mould) {
        console.log('⏳ Skipping defect reason breakdown fetch - missing requirements:', {
          dateRange: !!currentDateRange,
          machine: !!filters.machine,
          mould: !!filters.mould
        });
        return;
      }

      setIsLoadingDefectReason(true);
      console.log('🔢 Starting defect reason breakdown fetch with filters:', {
        machine: filters.machine,
        mould: filters.mould,
        dateRange: formatDateRange(currentDateRange)
      });

      try {
        const result = await calculateDefectReasonBreakdown(
          filters.machine,
          filters.mould,
          currentDateRange
        );
        
        setDefectReasonData(result);
        console.log('✅ Defect reason breakdown fetched:', result.length, 'reasons');
        
        // Validation logging for UI
        if (result.length > 0) {
          const totalUnits = result.reduce((sum, reason) => sum + reason.count, 0);
          const totalPercentage = result.reduce((sum, reason) => sum + reason.value, 0);
          console.log('🔍 Frontend validation:');
          console.log(`   - Total units in UI chart: ${totalUnits}`);
          console.log(`   - Total percentage in UI chart: ${totalPercentage.toFixed(2)}%`);
          console.log('📊 Individual slices:');
          result.forEach((reason, index) => {
            console.log(`   ${index + 1}. ${reason.name}: ${reason.count} units (${reason.value.toFixed(2)}%)`);
          });
        }
      } catch (error) {
        console.error('❌ Defect reason breakdown fetch failed:', error);
        setDefectReasonData([]);
      } finally {
        setIsLoadingDefectReason(false);
      }
    };

    // Add a small delay to avoid too frequent API calls
    const timeoutId = setTimeout(fetchDefectReasonBreakdown, 1500);
    return () => clearTimeout(timeoutId);
  }, [filters.machine, filters.mould, currentDateRange]);

  // Calculate production vs target data when machine, mould, or date range changes
  useEffect(() => {
    const calculateProductionVsTarget = async () => {
      if (!currentDateRange || !filters.machine || !filters.mould) {
        console.log('⏳ Skipping production vs target calculation - missing requirements:', {
          dateRange: !!currentDateRange,
          machine: !!filters.machine,
          mould: !!filters.mould
        });
        return;
      }

      setIsLoadingProductionVsTarget(true);
      console.log('📊 Starting production vs target calculation with filters:', {
        machine: filters.machine,
        mould: filters.mould,
        dateRange: formatDateRange(currentDateRange)
      });

      try {
        const result = await calculateProductionVsTargetData(
          filters.machine,
          filters.mould,
          currentDateRange
        );
        
        if (result && result.length > 0) {
          setProductionVsTargetData(result);
          console.log('✅ Production vs target calculation completed:', result);
          console.log('📊 Chart Data Preview:', result.slice(0, 3));
          console.log('📊 Total months with data:', result.length);
        } else {
          console.warn('⚠️ No production vs target data returned from API');
          setProductionVsTargetData([]);
        }
      } catch (error) {
        console.error('❌ Production vs target calculation failed:', error);
        setProductionVsTargetData([]);
      } finally {
        setIsLoadingProductionVsTarget(false);
      }
    };

    // Add a small delay to avoid too frequent API calls
    const timeoutId = setTimeout(calculateProductionVsTarget, 1400);
    return () => clearTimeout(timeoutId);
  }, [filters.machine, filters.mould, currentDateRange]);

  // Mock data for remaining KPIs (not yet implemented with real API data)
  const generateKpiData = (machine: string, mould: string) => ({
    totalDowntime: machine === "IMM-02" && mould === "PP TRAY NEW" ? 32 : 45,
    moldHealthIndex: machine === "IMM-02" && mould === "PP TRAY NEW" ? 92 : 87
  });

  const generateTopRejectionReasons = (machine: string, mould: string) => {
    if (machine === "IMM-01" && mould === "PP TRAY NEW") {
      return [
        { reason: "Short Molding", count: 89, rate: "46%" },
        { reason: "Silver Mark", count: 67, rate: "34%" },
        { reason: "Shrink Mark /Sink Mark", count: 39, rate: "20%" }
      ];
    }
    return [
      { reason: "Short Molding", count: 123, rate: "42%" },
      { reason: "Shrink Mark /Sink Mark", count: 89, rate: "31%" },
      { reason: "Silver Mark", count: 65, rate: "23%" }
    ];
  };



  const generateMaintenanceData = (machine: string, mould: string) => {
    if (machine === "IMM-02" && mould === "PP TRAY NEW") {
      return [
        { category: "Planned Maintenance", downtime: 15, postDowntimeDefects: 28 },
        { category: "Unplanned Maintenance", downtime: 8, postDowntimeDefects: 35 },
        { category: "Emergency Repair", downtime: 5, postDowntimeDefects: 18 },
        { category: "Preventive Maintenance", downtime: 4, postDowntimeDefects: 12 }
      ];
    }
    return [
      { category: "Planned Maintenance", downtime: 18, postDowntimeDefects: 32 },
      { category: "Unplanned Maintenance", downtime: 12, postDowntimeDefects: 45 },
      { category: "Emergency Repair", downtime: 8, postDowntimeDefects: 25 },
      { category: "Preventive Maintenance", downtime: 7, postDowntimeDefects: 18 }
    ];
  };





  const generatePlanRunHistory = (machine: string, mould: string) => {
    if (machine === "IMM-01" && mould === "PP TRAY NEW") {
      return [
        {
          planId: "PR003",
          startTime: "08:00 AM",
          endTime: "04:00 PM",
          machine: "IMM-01",
          mould: "PP TRAY NEW",
          defectRate: "1.5%",
          mhr: "97%",
          status: "Completed"
        },
        {
          planId: "PR004",
          startTime: "04:00 PM",
          endTime: "12:00 AM",
          machine: "IMM-01",
          mould: "PP TRAY NEW",
          defectRate: "1.8%",
          mhr: "94%",
          status: "In Progress"
        }
      ];
    }
    return [
      {
        planId: "PR001",
        startTime: "08:00 AM",
        endTime: "04:00 PM",
        machine: "IMM-02",
        mould: "GPPS TRAY 275 NEW",
        defectRate: "1.8%",
        mhr: "95%",
        status: "Completed"
      },
      {
        planId: "PR002",
        startTime: "04:00 PM",
        endTime: "12:00 AM",
        machine: "IMM-03",
        mould: "PP TRAY NEW",
        defectRate: "2.1%",
        mhr: "92%",
        status: "In Progress"
      }
    ];
  };

  const mockKpiData = generateKpiData(filters.machine, filters.mould);
  const topRejectionReasons = generateTopRejectionReasons(filters.machine, filters.mould);
  const maintenanceData = generateMaintenanceData(filters.machine, filters.mould);
  const planRunHistory = generatePlanRunHistory(filters.machine, filters.mould);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  useEffect(() => {
    setIsLoading(true);
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Check if current combination should show no data
      if (filters.machine === "IMM-01" && filters.mould === "PP TRAY NEW") {
        setShowNoData(true);
      } else {
        setShowNoData(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [filters.machine, filters.mould, filters.timePeriod]);

  const filteredMachines = machines.filter(machine =>
    machine.toLowerCase().includes(machineSearch.toLowerCase())
  );

  const filteredMoulds = moulds.filter(mould =>
    mould.toLowerCase().includes(mouldSearch.toLowerCase())
  );

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSwitchToRecommendedMachine = () => {
    // Use second machine from hardcoded list as recommendation
    handleFilterChange("machine", hardcodedMachines[1]);
    setShowNoData(false);
  };

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (showNoData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Defect Trend Analysis Dashboard</h1>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Plant Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Plant</label>
                <Select value={filters.plant} onValueChange={(value) => handleFilterChange("plant", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sood">Sood</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Machine Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Machine</label>
                <Select value={filters.machine} onValueChange={(value) => handleFilterChange("machine", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Machine" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search machines..."
                          className="pl-8"
                          value={machineSearch}
                          onChange={(e) => setMachineSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    {filteredMachines.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {machineSearch ? "No machines found" : "No machines available"}
                      </div>
                    ) : (
                      filteredMachines.map((machine) => (
                        <SelectItem key={machine} value={machine}>
                          {machine}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Mould Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Mould
                  {isLoadingMoulds && (
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </label>
                <Select value={filters.mould} onValueChange={(value) => handleFilterChange("mould", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingMoulds ? "Loading moulds..." : "Select Mould"} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search moulds..."
                          className="pl-8"
                          value={mouldSearch}
                          onChange={(e) => setMouldSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    {isLoadingMoulds ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading moulds...</span>
                      </div>
                    ) : (
                      <>
                        {filteredMoulds.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {mouldSearch ? "No moulds found" : "No moulds available"}
                          </div>
                        ) : (
                          filteredMoulds.map((mould) => (
                            <SelectItem key={mould} value={mould}>
                              {mould}
                            </SelectItem>
                          ))
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Period Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Time Period</label>
                <Select value={filters.timePeriod} onValueChange={(value) => handleFilterChange("timePeriod", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeperiods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Date Range Display */}
                {currentDateRange && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    📅 {formatDateRange(currentDateRange)}
                  </div>
                )}
              </div>

              {/* Custom Date Range */}
              {filters.timePeriod === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date Range</label>
                  <div className="flex gap-2">
                    {/* Start Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal flex-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.customStartDate ? format(filters.customStartDate, "MMM dd") : "Start Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.customStartDate}
                          onSelect={(date) => handleFilterChange("customStartDate", date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {/* End Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal flex-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.customEndDate ? format(filters.customEndDate, "MMM dd") : "End Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.customEndDate}
                          onSelect={(date) => handleFilterChange("customEndDate", date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </div>

          <NoDataScreen
            currentMachine={filters.machine}
            currentMould={filters.mould}
            recommendedMachine={hardcodedMachines[1]} // Use second machine as recommendation
            onSwitchMachine={handleSwitchToRecommendedMachine}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Defect Trend Analysis Dashboard</h1>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Plant Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Plant</label>
              <Select value={filters.plant} onValueChange={(value) => handleFilterChange("plant", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sood">Sood</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Machine Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Machine</label>
              <Select value={filters.machine} onValueChange={(value) => handleFilterChange("machine", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Machine" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search machines..."
                        className="pl-8"
                        value={machineSearch}
                        onChange={(e) => setMachineSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  {filteredMachines.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineSearch ? "No machines found" : "No machines available"}
                    </div>
                  ) : (
                    filteredMachines.map((machine) => (
                      <SelectItem key={machine} value={machine}>
                        {machine}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Mould Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Mould
                {isLoadingMoulds && (
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </label>
              <Select value={filters.mould} onValueChange={(value) => handleFilterChange("mould", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingMoulds ? "Loading moulds..." : "Select Mould"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search moulds..."
                        className="pl-8"
                        value={mouldSearch}
                        onChange={(e) => setMouldSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  {isLoadingMoulds ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading moulds...</span>
                    </div>
                  ) : (
                    <>
                      {filteredMoulds.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {mouldSearch ? "No moulds found" : "No moulds available"}
                        </div>
                      ) : (
                        filteredMoulds.map((mould) => (
                          <SelectItem key={mould} value={mould}>
                            {mould}
                          </SelectItem>
                        ))
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Time Period Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Time Period</label>
              <Select value={filters.timePeriod} onValueChange={(value) => handleFilterChange("timePeriod", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeperiods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Date Range Display */}
              {currentDateRange && (
                <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                  📅 {formatDateRange(currentDateRange)}
                </div>
              )}
            </div>

            {/* Custom Date Range */}
            {filters.timePeriod === "custom" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <div className="flex gap-2">
                  {/* Start Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal flex-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.customStartDate ? format(filters.customStartDate, "MMM dd") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.customStartDate}
                        onSelect={(date) => handleFilterChange("customStartDate", date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* End Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal flex-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.customEndDate ? format(filters.customEndDate, "MMM dd") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.customEndDate}
                        onSelect={(date) => handleFilterChange("customEndDate", date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Section - KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Total Units Produced
                {isLoadingKPI && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiData ? kpiData.totalUnitsProduced.toLocaleString() : (isLoadingKPI ? "Calculating..." : "0")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Total Rejection
                {isLoadingKPI && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiData ? kpiData.totalRejection.toLocaleString() : (isLoadingKPI ? "Calculating..." : "0")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Post Downtime DR
                {isLoadingKPI && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiData ? kpiData.postDowntimeDR.toFixed(2) + '%' : (isLoadingKPI ? "Calculating..." : "0%")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Total Downtime
                {isLoadingKPI && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiData ? kpiData.totalDowntime.toFixed(2) + 'h' : (isLoadingKPI ? "Calculating..." : "0h")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Mold Health Index
                {isLoadingKPI && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiData ? kpiData.moldHealthIndex.toFixed(2) + '%' : (isLoadingKPI ? "Calculating..." : "0%")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Rejection Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top Rejection Reasons
              {isLoadingKPI && (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingKPI ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-600">Calculating rejection reasons...</span>
              </div>
            ) : kpiData && kpiData.topRejectionReasons && kpiData.topRejectionReasons.length > 0 ? (
              <div className={`grid gap-4 ${
                kpiData.topRejectionReasons.length === 1 ? 'grid-cols-1' :
                kpiData.topRejectionReasons.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-3'
              }`}>
                {kpiData.topRejectionReasons.map((reason, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-red-500">
                    <div className="text-sm font-medium text-gray-600 mb-1">{reason.reason}</div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{reason.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 text-gray-400 mb-2" />
                <div className="text-lg font-medium">No rejections recorded</div>
                <div className="text-sm text-center mt-1">
                  {kpiData ? (
                    <>No rejection data found for <strong>{filters.machine}</strong> with mould <strong>{filters.mould}</strong></>
                  ) : (
                    "Select machine, mould, and time period to view rejection reasons"
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Defect Rate vs Units Produced */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Defect Rate vs Units Produced
                {isLoadingMonthlyChart && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMonthlyChart ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading monthly defect rate data...</span>
                </div>
              ) : monthlyDefectRateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyDefectRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left"
                      label={{ value: 'Units Produced', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      label={{ value: 'Defect Rate (%)', angle: 90, position: 'insideRight' }}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        if (name === 'Units Produced') {
                          return [value.toLocaleString() + ' units', name];
                        } else if (name === 'Defect Rate %') {
                          const defectUnits = props.payload?.defectUnits || 0;
                          return [`${Number(value).toFixed(2)}% (${defectUnits} defects)`, name];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `📅 Month: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="unitsProduced" 
                      fill="#8884d8" 
                      name="Units Produced"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="defectRate" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
                      name="Defect Rate %"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 text-gray-400 mb-2" />
                  <div className="text-lg font-medium">No monthly data available</div>
                  <div className="text-sm text-center mt-1">
                    No defect rate data found for <strong>{filters.machine}</strong> with mould <strong>{filters.mould}</strong>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planned vs Unplanned Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle>Planned vs Unplanned Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="downtime" fill="#8884d8" name="Downtime (hrs)" />
                  <Bar dataKey="postDowntimeDefects" fill="#82ca9d" name="Post-Downtime Defects" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Defect Reason Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Defect Reason Breakdown
                {isLoadingDefectReason && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDefectReason ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading defect reason breakdown...</span>
                </div>
              ) : defectReasonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={defectReasonData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value, count }) => `${name}: ${value.toFixed(2)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {defectReasonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${Number(value).toFixed(2)}% (${props.payload.count} units)`, 
                        name
                      ]} 
                      labelFormatter={(label) => `Defect Reason: ${label}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Target className="h-12 w-12 text-gray-400 mb-2" />
                  <div className="text-lg font-medium">No defect reason breakdown data available</div>
                  <div className="text-sm text-center mt-1">
                    No defect reason data found for <strong>{filters.machine}</strong> with mould <strong>{filters.mould}</strong>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production vs Target */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Production vs Target
                {isLoadingProductionVsTarget && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProductionVsTarget ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading production vs target data...</span>
                </div>
              ) : productionVsTargetData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionVsTargetData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tickFormatter={(value) => value.toLocaleString()}
                      label={{ value: 'Units', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString()} units`, 
                        name
                      ]}
                      labelFormatter={(label) => `📅 Month: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="target" fill="#ff7c7c" name="Target" />
                    <Bar dataKey="production" fill="#82ca9d" name="Production" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Target className="h-12 w-12 text-gray-400 mb-2" />
                  <div className="text-lg font-medium">No production vs target data available</div>
                  <div className="text-sm text-center mt-1">
                    No production/target data found for <strong>{filters.machine}</strong> with mould <strong>{filters.mould}</strong>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Run History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Plan Run History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-700">Plan ID</th>
                    <th className="text-left p-3 font-medium text-gray-700">Start Time</th>
                    <th className="text-left p-3 font-medium text-gray-700">End Time</th>
                    <th className="text-left p-3 font-medium text-gray-700">Machine</th>
                    <th className="text-left p-3 font-medium text-gray-700">Mould</th>
                    <th className="text-left p-3 font-medium text-gray-700">Defect Rate</th>
                    <th className="text-left p-3 font-medium text-gray-700">MHR</th>
                    <th className="text-left p-3 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {planRunHistory.map((run, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{run.planId}</td>
                      <td className="p-3">{run.startTime}</td>
                      <td className="p-3">{run.endTime}</td>
                      <td className="p-3">{run.machine}</td>
                      <td className="p-3">{run.mould}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          parseFloat(run.defectRate) > 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {run.defectRate}
                        </span>
                      </td>
                      <td className="p-3">{run.mhr}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          run.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
