import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { mockState, emptyData } = vi.hoisted(() => ({
  mockState: {
    user: null,
    queryData: {}
  },
  emptyData: {
    leads: { leads: [], totalCount: 0, totalPages: 1 },
    contacts: { contacts: [], totalCount: 0, totalPages: 1 },
    companies: { companies: [], totalCount: 0, totalPages: 1 },
    deals: { deals: [], totalsByStage: {}, totalPipelineValue: 0 },
    dealMetrics: {},
    duplicates: { count: 0, duplicates: [] },
    tasks: { tasks: [], stats: { total: 0, overdue: 0, dueToday: 0, pending: 0 } },
    activities: { activities: [], totalCount: 0, totalPages: 1 },
    invoices: [],
    tickets: [],
    emailTemplates: [],
    emailLogs: [],
    emailThreads: { threads: [] },
    backupHistory: { snapshots: [] },
    automations: { automations: [] },
    products: [],
    calendarSync: { status: "connected", scheduledEventsCount: 0 },
    authUsers: { users: [] },
    contactActivities: { activities: [] },
    contact: null,
    company: null
  }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: mockState.user,
    logout: vi.fn(),
    refreshUser: vi.fn()
  })
}));

vi.mock("../components/WorkspaceShell", () => ({
  default: ({ children }) => <div data-testid="workspace-shell">{children}</div>
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: (options) => {
      const key = options?.queryKey?.[0];
      return {
        data: mockState.queryData[key] ?? [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
      };
    },
    useMutation: (options) => {
      const run = (variables) =>
        Promise.resolve(options?.mutationFn?.(variables)).then((result) => {
          options?.onSuccess?.(result, variables);
          return result;
        });
      return {
        mutate: vi.fn(run),
        mutateAsync: vi.fn(run),
        isPending: false,
        isError: false,
        error: null
      };
    }
  };
});

vi.mock("../services/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    updateProduct: vi.fn().mockResolvedValue({}),
    createProduct: vi.fn().mockResolvedValue({})
  };
});

import Dashboard from "../pages/Dashboard";
import { updateProduct } from "../services/api";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/:section" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  );
}

const catalogUser = {
  name: "Catalog Editor",
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["catalog.view", "catalog.edit"]
};

const ticketViewer = {
  name: "Ticket Viewer",
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["tickets.view"]
};

const ticketManager = {
  name: "Ticket Manager",
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["tickets.view", "tickets.create", "tickets.edit"]
};

const ticket = {
  id: 42,
  ticketNumber: "TCK-0042",
  subject: "Cannot access billing",
  status: "Open",
  priority: "High",
  createdAt: new Date("2026-11-17T10:00:00Z").toISOString(),
  Contact: { name: "Ada Lovelace", company: "Analytical Engines" }
};

beforeEach(() => {
  mockState.user = null;
  mockState.queryData = Object.fromEntries(
    Object.entries(emptyData).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : { ...value }
    ])
  );
  vi.clearAllMocks();
});

describe("Catalog editing", () => {
  it("opens the edit modal and submits the updated catalog item", async () => {
    mockState.user = catalogUser;
    mockState.queryData.products = [
      {
        id: 11,
        name: "Existing Service",
        sku: "SVC-011",
        description: "Original description",
        price: 500,
        category: "Services",
        unit: "hour",
        is_active: true
      }
    ];

    renderAt("/app/catalog");

    expect(screen.getByText("Existing Service")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Edit catalog item"));

    expect(screen.getByRole("heading", { name: "Edit catalog item" })).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Existing Service"), {
      target: { value: "Updated Service" }
    });
    fireEvent.change(screen.getByDisplayValue("500"), {
      target: { value: "650" }
    });
    fireEvent.change(screen.getByDisplayValue("Original description"), {
      target: { value: "Updated scope" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith({
        id: 11,
        data: expect.objectContaining({
          name: "Updated Service",
          price: "650",
          description: "Updated scope"
        })
      });
    });
  });
});

describe("Ticket permission gating", () => {
  it("hides create and resolve controls from a view-only user", () => {
    mockState.user = ticketViewer;
    mockState.queryData.tickets = [ticket];

    renderAt("/app/tickets");

    expect(screen.getByText("Cannot access billing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^resolve$/i })).not.toBeInTheDocument();
    expect(screen.getByTitle("View ticket")).toBeInTheDocument();
  });

  it("shows create and resolve controls to a permitted ticket manager", () => {
    mockState.user = ticketManager;
    mockState.queryData.tickets = [ticket];

    renderAt("/app/tickets");

    expect(screen.getByRole("button", { name: /open ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^resolve$/i })).toBeInTheDocument();
    expect(screen.getByTitle("View ticket")).toBeInTheDocument();
  });
});
