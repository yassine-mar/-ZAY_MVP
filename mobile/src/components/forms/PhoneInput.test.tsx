/**
 * Form-component test — covers PhoneInput's tricky parts:
 *   1. Strips +212 prefix and shows national digits
 *   2. Auto-formats as "6 12 34 56 78"
 *   3. Stores the raw "+212XXXXXXXXX" in the form state
 *   4. Caps input at 9 national digits
 *   5. Displays the RHF field error inline
 *
 * The hard part with RHF tests is needing a useForm context; the standard
 * pattern is a tiny harness component that exposes the form state via a
 * callback so assertions can read it.
 */
import { useEffect } from 'react';
import { useForm, type Control, type FieldValues } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import Joi from 'joi';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { render } from '@/test-utils/render';
import { PhoneInput } from './PhoneInput';

const schema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+212[5-7]\d{8}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid Moroccan phone number',
      'string.empty': 'Phone is required',
    }),
});

function Harness({
  onState,
}: {
  onState: (state: { value: string; control: Control<FieldValues> }) => void;
}) {
  const { control, watch } = useForm({
    resolver: joiResolver(schema),
    defaultValues: { phone: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const value = watch('phone');
  useEffect(() => {
    onState({ value, control: control as Control<FieldValues> });
  }, [value, control, onState]);

  return <PhoneInput control={control} name="phone" />;
}

describe('<PhoneInput />', () => {
  it('renders the +212 prefix as non-editable adornment', () => {
    const { getByText } = render(
      <Harness onState={() => undefined} />,
      { withNavigation: false },
    );
    expect(getByText('+212')).toBeOnTheScreen();
  });

  it('formats input as "6 12 34 56 78" while storing "+212612345678"', async () => {
    let state: { value: string } | undefined;
    const { getByLabelText } = render(
      <Harness onState={(s) => { state = s; }} />,
      { withNavigation: false },
    );

    const input = getByLabelText('Phone');
    fireEvent.changeText(input, '612345678');

    await waitFor(() => {
      expect(input.props.value).toBe('6 12 34 56 78');
      expect(state?.value).toBe('+212612345678');
    });
  });

  it('drops non-digit characters and caps at 9 national digits', async () => {
    let state: { value: string } | undefined;
    const { getByLabelText } = render(
      <Harness onState={(s) => { state = s; }} />,
      { withNavigation: false },
    );

    const input = getByLabelText('Phone');
    fireEvent.changeText(input, 'abc 6-12-34-56-78-99-99');

    await waitFor(() => {
      // Strips letters/dashes, keeps first 9 digits.
      expect(state?.value).toBe('+212612345678');
    });
  });

  it('shows the RHF validation error when the field is invalid on blur', async () => {
    const { getByLabelText, findByText } = render(
      <Harness onState={() => undefined} />,
      { withNavigation: false },
    );

    const input = getByLabelText('Phone');
    fireEvent.changeText(input, '5');           // too short, also wrong prefix
    fireEvent(input, 'blur');

    expect(
      await findByText(/valid moroccan phone/i),
    ).toBeOnTheScreen();
  });

  it('does NOT show an error on a valid Moroccan mobile number', async () => {
    const { getByLabelText, queryByText } = render(
      <Harness onState={() => undefined} />,
      { withNavigation: false },
    );

    const input = getByLabelText('Phone');
    fireEvent.changeText(input, '612345678');
    fireEvent(input, 'blur');

    await waitFor(() => {
      expect(queryByText(/valid moroccan phone/i)).toBeNull();
    });
  });
});
