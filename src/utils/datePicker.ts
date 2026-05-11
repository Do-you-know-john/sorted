import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

export function openAndroidPicker(
  value: Date,
  mode: 'date' | 'time' | 'datetime',
  onConfirm: (date: Date) => void,
  options?: { minimumDate?: Date; is24Hour?: boolean },
): void {
  if (mode === 'time') {
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: options?.is24Hour ?? true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onConfirm(date);
      },
    });
  } else if (mode === 'date') {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate: options?.minimumDate,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onConfirm(date);
      },
    });
  } else {
    // datetime: open date picker first, then time picker in the callback
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate: options?.minimumDate,
      onChange: (event, selectedDate) => {
        if (event.type !== 'set' || !selectedDate) return;
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, fullDate) => {
            if (timeEvent.type === 'set' && fullDate) onConfirm(fullDate);
          },
        });
      },
    });
  }
}
