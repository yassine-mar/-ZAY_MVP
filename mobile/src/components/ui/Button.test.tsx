/**
 * Component-tier test — exercises a UI primitive in isolation.
 * No providers needed beyond the default render wrapper.
 */
import { fireEvent } from '@testing-library/react-native';
import { render } from '@/test-utils/render';
import { Button } from './Button';

describe('<Button />', () => {
  it('renders its label and is accessible as a button', () => {
    const { getByRole } = render(
      <Button onPress={() => undefined}>Place order</Button>,
      { withNavigation: false },
    );

    const btn = getByRole('button', { name: 'Place order' });
    expect(btn).toBeOnTheScreen();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress}>Go</Button>,
      { withNavigation: false },
    );

    fireEvent.press(getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress} disabled>Go</Button>,
      { withNavigation: false },
    );

    fireEvent.press(getByRole('button', { name: 'Go' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does NOT fire onPress while loading and announces busy state', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress} loading>Saving…</Button>,
      { withNavigation: false },
    );

    const btn = getByRole('button');
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    // Verify accessibility state for screen readers.
    expect(btn.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, busy: true }),
    );
  });

  it('honors a custom accessibilityLabel over the visible children', () => {
    const { getByRole } = render(
      <Button onPress={() => undefined} accessibilityLabel="Submit registration">
        Sign up
      </Button>,
      { withNavigation: false },
    );

    expect(getByRole('button', { name: 'Submit registration' })).toBeOnTheScreen();
  });
});
