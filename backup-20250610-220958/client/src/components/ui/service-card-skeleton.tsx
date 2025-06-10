import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ServiceCardSkeleton() {
  return (
    <Card className="w-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-pulse">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 animate-pulse" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 animate-pulse" />
              <Skeleton className="h-4 w-24 animate-pulse" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 animate-pulse" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Location and distance */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 w-4 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-48 animate-pulse" />
            <Skeleton className="h-3 w-24 animate-pulse" />
          </div>
        </div>
        
        {/* Date */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 animate-pulse" />
          <Skeleton className="h-4 w-32 animate-pulse" />
        </div>
        
        {/* Price */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 animate-pulse" />
          <Skeleton className="h-4 w-20 animate-pulse" />
        </div>
        
        {/* Store */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 animate-pulse" />
          <Skeleton className="h-4 w-28 animate-pulse" />
        </div>
        
        {/* Project files */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 animate-pulse" />
          <Skeleton className="h-4 w-36 animate-pulse" />
        </div>
        
        {/* Action button */}
        <div className="pt-2">
          <Skeleton className="h-10 w-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ServiceCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <ServiceCardSkeleton key={index} />
      ))}
    </div>
  );
}