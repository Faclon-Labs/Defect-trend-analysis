
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoDataScreenProps {
  currentMachine: string;
  currentMould: string;
  recommendedMachine: string;
  onSwitchMachine: () => void;
}

export const NoDataScreen = ({
  currentMachine,
  currentMould,
  recommendedMachine,
  onSwitchMachine
}: NoDataScreenProps) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-lg w-full mx-4">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No Data Available
            </h2>
            <p className="text-gray-600 mb-4">
              No mold run found for <strong>{currentMould}</strong> in the current quarter.
            </p>
            <p className="text-gray-600 mb-6">
              However, this mold was last active on <span className="text-blue-600 font-medium">{recommendedMachine}</span>
            </p>
            <p className="text-sm text-gray-500">
              Try selecting a different time period or check the machine configuration.
            </p>
          </div>

          <Button 
            onClick={onSwitchMachine}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Switch to {recommendedMachine}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
