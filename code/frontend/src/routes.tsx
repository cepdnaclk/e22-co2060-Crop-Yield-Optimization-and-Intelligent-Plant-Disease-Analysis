/**
 * Application Routing Configuration
 * Defines all public and protected routes for the application.
 * Uses React Router v6 and includes strict token validation guards.
 */
import { createBrowserRouter, Navigate } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { userAPI } from "./services/api";
import { LoginPage } from "./components/LoginPage";
import { FarmerLayout } from "./components/layouts/FarmerLayout";
import { AdminLayout } from "./components/layouts/AdminLayout";
import { HomePage } from "./components/HomePage";
import { CropDataPage } from "./components/CropDataPage";
import { DiseasePage } from "./components/DiseasePage";
import { ProfilePage } from "./components/ProfilePage";
import { ReportsPage } from "./components/ReportsPage";
import { MessagesPage } from "./components/MessagesPage";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AllFarmers } from "./components/admin/AllFarmers";
import { RegisterFarmer } from "./components/admin/RegisterFarmer";
import { AddHarvest } from "./components/admin/AddHarvest";
import { HarvestHistory } from "./components/admin/HarvestHistory";
import { AdminReports } from "./components/admin/AdminReports";
import { AdminProfilePage } from "./components/admin/AdminProfilePage";
import { AdminInquiries } from "./components/admin/AdminInquiries";
import { NotFoundPage } from "./components/NotFoundPage";
import { getAuthData, isAdmin, isFarmer } from "./utils/authUtils";
import { FarmerDetails } from "./components/admin/FarmerDetails";

// Protected Route Component for Farmers
function FarmerRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const auth = getAuthData();

  useEffect(() => {
    const validateToken = async () => {
      if (!auth || auth.userType !== 'farmer') {
        setIsValid(false);
        setIsValidating(false);
        return;
      }
      try {
        const response = await userAPI.fetchProfile();
        // Normalize role ('user' or 'farmer' both count as farmer frontend)
        const actualRole = response?.user?.role === 'user' ? 'farmer' : response?.user?.role;

        if (actualRole === 'farmer') {
          setIsValid(true);
        } else {
          throw new Error('Role mismatch');
        }
      } catch (error) {
        localStorage.removeItem('agriconnect_auth');
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };
    validateToken();
  }, [auth]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mb-4"></div>
        <p className="text-green-800 font-medium">{t('route.verifyingSession')}</p>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Protected Route Component for Admins
function AdminRoute({ children }: { children: React.ReactNode }) {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const auth = getAuthData();

  useEffect(() => {
    const validateToken = async () => {
      if (!auth || auth.userType !== 'admin') {
        setIsValid(false);
        setIsValidating(false);
        return;
      }
      try {
        const response = await userAPI.fetchProfile();

        if (response?.user?.role === 'admin') {
          setIsValid(true);
        } else {
          throw new Error('Role mismatch');
        }
      } catch (error) {
        localStorage.removeItem('agriconnect_auth');
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };
    validateToken();
  }, [auth]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mb-4"></div>
        <p className="text-green-800 font-medium">Verifying Admin Session...</p>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Root redirect based on auth state
function RootRedirect() {
  const auth = getAuthData();

  if (!auth) {
    return <LoginPage />;
  }

  if (auth.userType === 'farmer') {
    return <Navigate to="/farmer/home" replace />;
  }

  if (auth.userType === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <LoginPage />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/farmer",
    element: (
      <FarmerRoute>
        <FarmerLayout />
      </FarmerRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/farmer/home" replace />,
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "crop-data",
        element: <CropDataPage />,
      },
      {
        path: "disease",
        element: <DiseasePage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "contact-admin",
        element: <MessagesPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "inquiries",
        element: <AdminInquiries />,
      },
      {
        path: "farmers",
        element: <AllFarmers />,
      },
      {
        path: "farmer-profile/:farmerId",
        element: <FarmerDetails />,
      },
      {
        path: "register-farmer",
        element: <RegisterFarmer />,
      },
      {
        path: "add-harvest",
        element: <AddHarvest />,
      },
      {
        path: "harvest-history",
        element: <HarvestHistory />,
      },
      {
        path: "reports",
        element: <AdminReports />,
      },
      {
        path: "profile",
        element: <AdminProfilePage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
