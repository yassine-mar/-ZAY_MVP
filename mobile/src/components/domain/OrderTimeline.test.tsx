/**
 * Domain-component test — renders the same component against several order
 * shapes and asserts the right step is "current" in each.
 *
 * Snapshot tests would be brittle here (style props), so we test the visible
 * text + the status meta we expect for each phase.
 */
import { render } from '@/test-utils/render';
import { OrderTimeline } from './OrderTimeline';
import { buildOrder, buildStatusEntry } from '@/test-utils/factories';
import { TIMELINE_STATUSES } from '@/constants/orderStatus';

describe('<OrderTimeline />', () => {
  it('renders every step label for an in-flight order', () => {
    const order = buildOrder({ status: 'preparing' });
    const history = [
      buildStatusEntry({ to_status: 'pending' }),
      buildStatusEntry({ from_status: 'pending', to_status: 'accepted' }),
      buildStatusEntry({ from_status: 'accepted', to_status: 'preparing' }),
    ];

    const { getByText } = render(
      <OrderTimeline order={order} history={history} />,
      { withNavigation: false },
    );

    for (const status of TIMELINE_STATUSES) {
      // labels are capitalized: Pending, Accepted, Preparing, Ready, Delivered
      const label = status[0]!.toUpperCase() + status.slice(1);
      expect(getByText(label)).toBeOnTheScreen();
    }
  });

  it('collapses the timeline to a single "Cancelled" entry for cancelled orders', () => {
    const order = buildOrder({ status: 'cancelled' });
    const history = [
      buildStatusEntry({ to_status: 'pending' }),
      buildStatusEntry({ from_status: 'pending', to_status: 'cancelled' }),
    ];

    const { getByText, queryByText } = render(
      <OrderTimeline order={order} history={history} />,
      { withNavigation: false },
    );

    expect(getByText('Cancelled')).toBeOnTheScreen();
    // Future steps shouldn't render in cancelled mode.
    expect(queryByText('Preparing')).toBeNull();
    expect(queryByText('Ready')).toBeNull();
  });

  it('shows a timestamp next to each step that has a history entry', () => {
    const order = buildOrder({ status: 'ready' });
    const acceptedAt = '2026-05-25T12:30:00Z';
    const history = [
      buildStatusEntry({ to_status: 'pending', changed_at: '2026-05-25T12:00:00Z' }),
      buildStatusEntry({ from_status: 'pending', to_status: 'accepted', changed_at: acceptedAt }),
    ];

    const { getByText } = render(
      <OrderTimeline order={order} history={history} />,
      { withNavigation: false },
    );

    // formatDateTime renders "25 May, 12:30" (en-GB)
    expect(getByText(/12:30/)).toBeOnTheScreen();
  });
});
