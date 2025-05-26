import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ServicePeriod {
  startDate: string;
  endDate: string;
  title?: string;
}

interface ServiceCalendarProps {
  servicePeriods?: ServicePeriod[];
  onDateClick?: (date: string) => void;
  initialDate?: Date;
}

export const ServiceCalendar: React.FC<ServiceCalendarProps> = ({
  servicePeriods = [],
  onDateClick,
  initialDate = new Date(),
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  
  // Dias da semana abreviados
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Nomes dos meses
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1);
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0);
    
    // Dia da semana do primeiro dia (0 = domingo)
    const firstDayOfWeek = firstDay.getDay();
    // Quantos dias tem o mês
    const daysInMonth = lastDay.getDate();
    
    // Dias do mês anterior para preencher o início
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const weeks = [];
    let currentWeek = [];
    
    // Adiciona dias do mês anterior
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      currentWeek.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        date: new Date(year, month - 1, daysInPrevMonth - i)
      });
    }
    
    // Adiciona dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push({
        day,
        isCurrentMonth: true,
        isPrevMonth: false,
        date: new Date(year, month, day)
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Adiciona dias do próximo mês para completar a última semana
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push({
        day: nextMonthDay,
        isCurrentMonth: false,
        isPrevMonth: false,
        date: new Date(year, month + 1, nextMonthDay)
      });
      nextMonthDay++;
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [currentDate]);

  const isDateInServicePeriod = (date: Date) => {
    return servicePeriods.some(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dayData: any) => {
    if (onDateClick && dayData.isCurrentMonth) {
      const dateString = dayData.date.toISOString().split('T')[0];
      onDateClick(dateString);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
        <div className="flex space-x-2">
          <button 
            className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <button 
            className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekdays.map((day, index) => (
          <div key={index} className="text-xs text-gray-500">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarData.map((week, weekIndex) => (
          week.map((dayData, dayIndex) => (
            <div 
              key={`${weekIndex}-${dayIndex}`}
              className={`py-2 ${
                !dayData.isCurrentMonth
                  ? 'text-gray-400' 
                  : 'text-gray-900'
              } ${
                isDateInServicePeriod(dayData.date) && dayData.isCurrentMonth
                  ? 'font-semibold bg-primary bg-opacity-10 rounded-full' 
                  : ''
              } text-sm cursor-pointer hover:bg-gray-100 rounded-full transition-colors`}
              onClick={() => handleDateClick(dayData)}
            >
              {dayData.day}
            </div>
          ))
        ))}
      </div>
    </div>
  );
};

export default ServiceCalendar;
