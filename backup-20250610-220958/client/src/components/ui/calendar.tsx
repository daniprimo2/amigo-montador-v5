import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("p-4 bg-white rounded-lg shadow-sm border", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-lg font-semibold text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell:
          "text-gray-600 rounded-md w-10 h-10 font-medium text-sm flex items-center justify-center",
        row: "flex w-full",
        cell: "relative p-0",
        day: cn(
          "h-10 w-10 text-center text-sm relative hover:bg-blue-50 rounded-md transition-colors",
          "flex items-center justify-center font-normal cursor-pointer",
          "border border-transparent hover:border-blue-200"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 font-semibold shadow-sm",
        day_today: "bg-blue-100 text-blue-900 border-blue-200 font-medium",
        day_outside:
          "text-gray-400 hover:bg-gray-50 hover:text-gray-600",
        day_disabled: "text-gray-300 cursor-not-allowed hover:bg-transparent hover:border-transparent",
        day_range_middle:
          "aria-selected:bg-blue-50 aria-selected:text-blue-900",
        day_hidden: "invisible",
        ...classNames,
      }}

      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
