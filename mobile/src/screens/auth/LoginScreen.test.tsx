/**
 * Screen-tier (UI) test — drives the full login flow as a user would:
 *
 *   1. Type email and password
 *   2. Hit submit
 *   3. Assert the right service call happens
 *   4. Assert the right inline error appears on failure
 *
 * Service is mocked at the module boundary; the actual form + RHF +
 * Joi + AppError funnel + button states all run for real.
 */
import { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '@/test-utils/render';
import {
  buildNavigationStub,
  buildRouteStub,
} from '@/test-utils/mockNavigation';

jest.mock('@/services/auth.service', () => ({
  authService: { login: jest.fn() },
}));
import { authService } from '@/services/auth.service';
import { LoginScreen } from './LoginScreen';

const buildAxiosError = (status: number, body?: unknown) => {
  const headers = new AxiosHeaders();
  const config = { headers, url: '/auth/login', method: 'POST' as const };
  const err = new AxiosError('Request failed', String(status), config as never);
  err.response = {
    status, statusText: '', headers: {}, config: config as never, data: body,
  };
  return err;
};

const renderLogin = () => {
  const navigation = buildNavigationStub();
  const route = buildRouteStub();
  const result = render(
    <LoginScreen navigation={navigation as never} route={route as never} />,
  );
  return { ...result, navigation };
};

describe('<LoginScreen />', () => {
  it('renders email and password fields plus a Log in button', () => {
    const { getByLabelText, getByRole } = renderLogin();

    expect(getByLabelText('Email')).toBeOnTheScreen();
    expect(getByLabelText('Password')).toBeOnTheScreen();
    expect(getByRole('button', { name: 'Log in' })).toBeOnTheScreen();
  });

  it('keeps the Log in button disabled until the form validates', () => {
    const { getByRole } = renderLogin();
    const btn = getByRole('button', { name: 'Log in' });
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('calls authService.login with the entered credentials on submit', async () => {
    (authService.login as jest.Mock).mockResolvedValue(undefined);

    const { getByLabelText, getByRole } = renderLogin();

    const email = getByLabelText('Email');
    const password = getByLabelText('Password');
    fireEvent.changeText(email, 'fatima@example.com');
    fireEvent(email, 'blur');
    fireEvent.changeText(password, 'StrongPass1!');
    fireEvent(password, 'blur');

    const submit = await waitFor(() => {
      const b = getByRole('button', { name: 'Log in' });
      expect(b.props.accessibilityState?.disabled).toBe(false);
      return b;
    });

    fireEvent.press(submit);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'fatima@example.com',
        password: 'StrongPass1!',
      });
    });
  });

  it('shows inline "Incorrect email or password" on 401 (no toast spam)', async () => {
    (authService.login as jest.Mock).mockRejectedValue(
      buildAxiosError(401, { code: 'UNAUTHORIZED', message: 'Invalid email or password' }),
    );

    const { getByLabelText, getByRole, findByText } = renderLogin();

    fireEvent.changeText(getByLabelText('Email'), 'fatima@example.com');
    fireEvent(getByLabelText('Email'), 'blur');
    fireEvent.changeText(getByLabelText('Password'), 'WrongPass1!');
    fireEvent(getByLabelText('Password'), 'blur');

    fireEvent.press(getByRole('button', { name: 'Log in' }));

    expect(await findByText(/incorrect email or password/i)).toBeOnTheScreen();
  });

  it('lets the user navigate to Forgot password via the link', () => {
    const { getByText, navigation } = renderLogin();
    fireEvent.press(getByText('Forgot password?'));
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('replaces the route stack with Register from the footer link', () => {
    const { getByText, navigation } = renderLogin();
    fireEvent.press(getByText('Create an account'));
    expect(navigation.replace).toHaveBeenCalledWith('Register');
  });
});
