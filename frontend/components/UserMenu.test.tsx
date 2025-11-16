import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UserMenu from '@/components/UserMenu'
import { SessionProvider } from 'next-auth/react'

// Mock next-auth
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react')
  return {
    ...actual,
    useSession: vi.fn(),
    signOut: vi.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

const mockSession = {
  user: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    image: 'https://example.com/avatar.jpg',
  },
  expires: '2024-12-31',
}

const mockSessionWithoutImage = {
  user: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
  },
  expires: '2024-12-31',
}

describe('UserMenu', async () => {
  const { useSession, signOut } = await import('next-auth/react')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should not render when no session', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)
    expect(container.firstChild).toBeNull()
  })

  it('should render user menu button when session exists', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should display user name in button', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should display user image when available', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)
    const img = container.querySelector('img[alt="John Doe"]')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('should display initials when no image available', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSessionWithoutImage,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('should display email when name is not available', () => {
    const sessionWithoutName = {
      user: {
        email: 'test@example.com',
      },
      expires: '2024-12-31',
    }

    vi.mocked(useSession).mockReturnValue({
      data: sessionWithoutName,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should open menu when button is clicked', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })
  })

  it('should close menu when button is clicked again', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })

    // Open menu
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })

    // Close menu
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.queryByText('john.doe@example.com')).not.toBeInTheDocument()
    })
  })

  it('should display sign out button in menu', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
  })

  it('should call signOut when sign out button is clicked', async () => {
    const mockSignOut = vi.fn()
    vi.mocked(signOut).mockImplementation(mockSignOut)

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const menuButton = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(menuButton)

    await waitFor(() => {
      const signOutButton = screen.getByText('Sign Out')
      fireEvent.click(signOutButton)
    })

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' })
  })

  it('should rotate arrow icon when menu is open', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    const arrow = container.querySelector('svg')

    expect(arrow).toHaveClass('rotate-0')

    fireEvent.click(button)

    await waitFor(() => {
      expect(arrow).toHaveClass('rotate-180')
    })
  })

  it('should display user info in dropdown', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const nameElements = screen.getAllByText('John Doe')
      expect(nameElements.length).toBeGreaterThan(0)
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })
  })

  it('should close menu when clicking outside', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(
      <div>
        <UserMenu />
        <div data-testid="outside">Outside</div>
      </div>
    )

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })

    const outside = screen.getByTestId('outside')
    fireEvent.mouseDown(outside)

    await waitFor(() => {
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
    })
  })

  it('should not close menu when clicking inside', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })

    const dropdown = screen.getByText('john.doe@example.com').closest('div')
    if (dropdown) {
      fireEvent.mouseDown(dropdown)
    }

    // Menu should still be open
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('should have proper z-index for dropdown', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const dropdown = screen.getByText('Sign Out').closest('.z-\\[1000\\]')
      expect(dropdown).toBeInTheDocument()
    })
  })

  it('should have rounded avatar container', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)
    const avatar = container.querySelector('.rounded-full')
    expect(avatar).toBeInTheDocument()
  })

  it('should display sign out icon', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const signOutButton = screen.getByText('Sign Out')
      const svg = signOutButton.closest('button')?.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  it('should handle single letter names for initials', () => {
    const sessionWithShortName = {
      user: {
        name: 'X',
        email: 'x@example.com',
      },
      expires: '2024-12-31',
    }

    vi.mocked(useSession).mockReturnValue({
      data: sessionWithShortName,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    const nameElements = screen.getAllByText('X')
    expect(nameElements.length).toBeGreaterThan(0)
  })

  it('should truncate long names to 2 initials', () => {
    const sessionWithLongName = {
      user: {
        name: 'John Michael Smith Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    }

    vi.mocked(useSession).mockReturnValue({
      data: sessionWithLongName,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    expect(screen.getByText('JM')).toBeInTheDocument()
  })

  it('should handle null name gracefully', () => {
    const sessionWithNullName = {
      user: {
        name: null,
        email: 'test@example.com',
      },
      expires: '2024-12-31',
    }

    vi.mocked(useSession).mockReturnValue({
      data: sessionWithNullName,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('should have hover effect on menu button', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)
    const button = container.querySelector('.hover\\:bg-black\\/5')
    expect(button).toBeInTheDocument()
  })

  it('should have border styling on button', () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)
    const button = container.querySelector('.border.border-custom')
    expect(button).toBeInTheDocument()
  })

  it('should have shadow on dropdown', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const dropdown = screen.getByText('Sign Out').closest('.shadow-card')
      expect(dropdown).toBeInTheDocument()
    })
  })

  it('should have minimum width on dropdown', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const dropdown = screen.getByText('Sign Out').closest('.min-w-\\[220px\\]')
      expect(dropdown).toBeInTheDocument()
    })
  })

  it('should position dropdown correctly', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const dropdown = screen.getByText('Sign Out').closest('.absolute.top-full.right-0')
      expect(dropdown).toBeInTheDocument()
    })
  })

  it('should have hover effect on sign out button', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      const signOutButton = screen.getByText('Sign Out').closest('button')
      expect(signOutButton).toHaveClass('hover:bg-black/5')
    })
  })

  it('should handle undefined session gracefully', () => {
    vi.mocked(useSession).mockReturnValue({
      data: undefined as any,
      status: 'loading',
      update: vi.fn(),
    })

    const { container } = render(<UserMenu />)
    expect(container.firstChild).toBeNull()
  })

  it('should cleanup event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    })

    const { unmount } = render(<UserMenu />)

    const button = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalled()
  })
})
