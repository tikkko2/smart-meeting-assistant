// Test for date formatting in MeetingDashboard
// This can be run in the browser console to test the formatDate function

const testFormatDate = (date) => {
  try {
    // Handle both Date objects and date strings
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error, 'Date value:', date);
    return 'Invalid date';
  }
};

// Test cases
console.log('Testing date formatting:');
console.log('Valid Date object:', testFormatDate(new Date()));
console.log('Valid date string:', testFormatDate('2025-06-30T10:00:00Z'));
console.log('Invalid date string:', testFormatDate('invalid-date'));
console.log('Null value:', testFormatDate(null));
console.log('Undefined value:', testFormatDate(undefined));
console.log('Empty string:', testFormatDate(''));
console.log('Number timestamp:', testFormatDate(Date.now()));
