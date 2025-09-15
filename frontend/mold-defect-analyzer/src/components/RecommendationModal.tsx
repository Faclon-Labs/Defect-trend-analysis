
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RecommendationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMachine: string;
  currentMould: string;
  recommendedMachine: string;
  onAcceptRecommendation: () => void;
}

export const RecommendationModal = ({
  open,
  onOpenChange,
  currentMachine,
  currentMould,
  recommendedMachine,
  onAcceptRecommendation
}: RecommendationModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Production Recommendation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Selection Issue */}
          <Card className="border-l-4 border-l-orange-500 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-800 mb-2">
                    Mould-Machine Combination Not Available
                  </h3>
                  <p className="text-orange-700">
                    The selected mould <strong>"{currentMould}"</strong> has not been run on machine <strong>"{currentMachine}"</strong> during the selected time period.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="border-l-4 border-l-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Recommended Alternative
                  </h3>
                  <p className="text-green-700 mb-4">
                    The mould <strong>"{currentMould}"</strong> has been successfully run on machine <strong>"{recommendedMachine}"</strong> with optimal performance metrics.
                  </p>
                  
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">1.8%</div>
                      <div className="text-xs text-gray-600">Defect Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">95%</div>
                      <div className="text-xs text-gray-600">MHR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">87%</div>
                      <div className="text-xs text-gray-600">Efficiency</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Machine Transition Visualization */}
          <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600">Current Selection</div>
              <div className="font-semibold text-gray-800">{currentMachine}</div>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
            <div className="text-center">
              <div className="text-sm text-gray-600">Recommended</div>
              <div className="font-semibold text-green-700">{recommendedMachine}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={onAcceptRecommendation}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Switch to {recommendedMachine}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Keep Current Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
