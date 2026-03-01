import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type AppStackParamList = {
    Dashboard: undefined;
    RecentActivity: undefined;
    AddEvent: undefined;
    EditEvent: { event: any };
    EventDetails: { event: any };
    Profile: undefined;
    UpcomingEvents: undefined;
    ClubProfile: { organizerId: string };
};

export type RootStackParamList = {
    Auth: undefined;
    App: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppNavigationProp = NativeStackNavigationProp<AppStackParamList>;
