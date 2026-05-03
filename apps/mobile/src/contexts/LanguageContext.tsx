// apps/mobile/src/contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Translation dictionary ───────────────────────────────────────────────────
// Add every user-facing string here. Key = constant identifier.
// DE = German (default). EN = English.
export const TRANSLATIONS = {
  loading: { de: 'Lädt...', en: 'Loading...' },
  save: { de: 'Speichern', en: 'Save' },
  cancel: { de: 'Abbrechen', en: 'Cancel' },
  delete: { de: 'Löschen', en: 'Delete' },
  confirm: { de: 'Bestätigen', en: 'Confirm' },
  back: { de: 'Zurück', en: 'Back' },
  next: { de: 'Weiter', en: 'Next' },
  close: { de: 'Schließen', en: 'Close' },
  edit: { de: 'Bearbeiten', en: 'Edit' },
  done: { de: 'Fertig', en: 'Done' },
  send: { de: 'Senden', en: 'Send' },
  search: { de: 'Suchen', en: 'Search' },
  all: { de: 'Alle', en: 'All' },
  yes: { de: 'Ja', en: 'Yes' },
  no: { de: 'Nein', en: 'No' },
  logout: { de: 'Abmelden', en: 'Sign out' },
  errorUnknown: { de: 'Ein unbekannter Fehler ist aufgetreten.', en: 'An unknown error occurred.' },
  noResults: { de: 'Keine Ergebnisse', en: 'No results' },

  error: { de: 'Fehler', en: 'Error' },
  errorOpenLink: { de: 'Konnte den Link nicht öffnen.', en: 'Could not open the link.' },
  enterPassword: { de: 'Bitte Passwort eingeben', en: 'Please enter your password.' },
  notAvailable: { de: 'N/A', en: 'N/A' },
  clientNameDefault: { de: 'Kunde', en: 'Client' },
  countryDefault: { de: 'Deutschland', en: 'Germany' },
  cityNotFound: { de: 'Stadt nicht gefunden.', en: 'City not found.' },
  locationUpdateFailed: { de: 'Standort konnte nicht aktualisiert werden.', en: 'Could not update location.' },
  locationPermissionNeeded: {
    de: 'Standortzugriff wird benötigt, um Braider nach Entfernung zu sortieren.',
    en: 'Location access is required to sort braiders by distance.',
  },
  phoneMissingTitle: { de: 'Keine Telefonnummer', en: 'No phone number' },
  phoneMissingBody: { de: 'Der Kunde hat keine Telefonnummer hinterlegt.', en: 'The customer has no phone number on file.' },

  login: { de: 'Anmelden', en: 'Sign in' },
  register: { de: 'Registrieren', en: 'Register' },
  email: { de: 'E-Mail', en: 'Email' },
  phone: { de: 'Telefon', en: 'Phone' },
  password: { de: 'Passwort', en: 'Password' },
  passwordConfirm: { de: 'Passwort bestätigen', en: 'Confirm password' },
  firstName: { de: 'Vorname', en: 'First name' },
  lastName: { de: 'Nachname', en: 'Last name' },
  forgotPassword: { de: 'Passwort vergessen?', en: 'Forgot password?' },
  welcomeBack: { de: 'Willkommen zurück!', en: 'Welcome back!' },
  noAccount: { de: 'Noch kein Konto? Jetzt registrieren', en: "Don't have an account? Register" },
  acceptTerms: { de: 'Ich akzeptiere die AGB und Datenschutzerklärung', en: 'I accept the terms and privacy policy' },
  splashTagline: { de: 'Verbinde dich mit deinem perfekten Style', en: 'Connect with your perfect style' },

  tabHome: { de: 'Startseite', en: 'Home' },
  tabSearch: { de: 'Suchen', en: 'Search' },
  tabAppointments: { de: 'Termine', en: 'Appointments' },
  tabMessages: { de: 'Nachrichten', en: 'Messages' },
  tabProfile: { de: 'Profil', en: 'Profile' },
  tabCalendar: { de: 'Termine', en: 'Calendar' },

  homeGreeting: { de: 'Hallo', en: 'Hello' },
  homeNearby: { de: 'Braiders in deiner Nähe', en: 'Braiders near you' },
  homePopular: { de: 'Beliebte Styles', en: 'Popular styles' },
  homeViewAll: { de: 'Alle anzeigen', en: 'View all' },
  homeSearchPlaceholder: { de: 'Suche nach Styles, Braiders, Salons...', en: 'Search styles, braiders, salons...' },
  homeNoBraiders: { de: 'Keine Braider verfügbar', en: 'No braiders available' },
  homeLocationLabel: { de: 'Standort ändern', en: 'Change location' },
  homeLocationModal: { de: 'Stadt eingeben', en: 'Enter city' },
  homeLocationBody: {
    de: 'Gib eine Stadt ein, um dort Anbieter zu sehen und zu buchen.',
    en: 'Enter a city to browse providers and book there.',
  },
  homeLocationPlaceholder: { de: 'z. B. Berlin, Hamburg...', en: 'e.g. Berlin, Hamburg...' },
  homeLocationApply: { de: 'Anwenden', en: 'Apply' },
  homeLocationGps: { de: 'GPS-Standort verwenden', en: 'Use GPS location' },

  searchResults: { de: 'Braider gefunden', en: 'braiders found' },
  searchEmpty: { de: 'Keine Ergebnisse für deine Suche', en: 'No results for your search' },
  searchAvailableToday: { de: 'Verfügbar heute', en: 'Available today' },
  searchSort: { de: 'Sortieren', en: 'Sort' },
  searchSortRecommended: { de: 'Empfohlen', en: 'Recommended' },
  searchSortDistance: { de: 'Entfernung', en: 'Distance' },
  searchSortRating: { de: 'Bewertung', en: 'Rating' },

  cardFrom: { de: 'ab', en: 'from' },
  cardAvailableToday: { de: 'Heute verfügbar', en: 'Available today' },
  cardReviews: { de: 'Bewertungen', en: 'reviews' },
  cardPriceOnRequest: { de: 'Preis auf Anfrage', en: 'Price on request' },

  profileTabOverview: { de: 'Überblick', en: 'Overview' },
  profileTabServices: { de: 'Services', en: 'Services' },
  profileTabGallery: { de: 'Galerie', en: 'Gallery' },
  profileTabReviews: { de: 'Bewertungen', en: 'Reviews' },
  profileBio: { de: 'Über mich', en: 'About me' },
  profileSpecialisations: { de: 'Spezialisierungen', en: 'Specialisations' },
  profileInfo: { de: 'Informationen', en: 'Information' },
  profileCancellation: { de: 'Stornierungsbedingungen', en: 'Cancellation policy' },
  profileBookNow: { de: 'Termin buchen', en: 'Book appointment' },
  profileMessage: { de: 'Nachricht', en: 'Message' },
  profilePrices: { de: 'Preise', en: 'Prices' },
  profileVerified: { de: 'Verifiziert', en: 'Verified' },
  profileNoPhotos: { de: 'Noch keine Fotos', en: 'No photos yet' },
  profileNoServices: { de: 'Noch keine Services', en: 'No services yet' },
  profileNoReviews: { de: 'Noch keine Bewertungen', en: 'No reviews yet' },
  profileResponseTime: { de: 'Antwortet in', en: 'Responds within' },
  profileSelectService: { de: 'Auswählen', en: 'Select' },
  profileNoSpecialisations: { de: 'Keine Spezialisierungen angegeben.', en: 'No specialisations provided.' },

  previewBanner: { de: '👁 Vorschau-Modus', en: '👁 Preview mode' },
  previewEdit: { de: 'Bearbeiten', en: 'Edit' },
  previewBookDisabled: { de: 'Termin buchen', en: 'Book appointment' },
  previewNote: { de: '(Vorschau — Kunden buchen hier)', en: '(Preview — customers book here)' },

  bookingStep: { de: 'Schritt', en: 'Step' },
  bookingOf: { de: 'von', en: 'of' },
  bookingSelectService: { de: 'Services auswählen', en: 'Select services' },
  bookingSelected: { de: 'ausgewählt', en: 'selected' },
  bookingTotal: { de: 'Gesamt', en: 'Total' },
  bookingServices: { de: 'Services', en: 'Services' },
  bookingSelectDate: { de: 'Datum & Zeit', en: 'Date & Time' },
  bookingAvailableTimes: { de: 'Verfügbare Zeiten', en: 'Available times' },
  bookingNoSlots: { de: 'Keine freien Termine an diesem Tag.', en: 'No available slots on this day.' },
  bookingChooseDate: { de: 'Wähle ein Datum', en: 'Choose a date' },
  bookingDetails: { de: 'Buchungsdetails', en: 'Booking details' },
  bookingMobileService: { de: 'Mobiler Service gewünscht', en: 'Mobile service requested' },
  bookingMobileSub: { de: 'Der Braider kommt zu dir nach Hause', en: 'The braider comes to you' },
  bookingNotes: { de: 'Notizen für den Braider', en: 'Notes for the braider' },
  bookingNotesPlaceholder: { de: 'Besondere Wünsche, Haartyp, Allergien...', en: 'Special requests, hair type, allergies...' },
  bookingPayment: { de: 'Zahlung', en: 'Payment' },
  bookingPaymentMethod: { de: 'Vor Ort bar zahlen', en: 'Pay cash on site' },
  bookingPaymentSub: { de: 'Bezahle direkt beim Termin', en: 'Pay directly at the appointment' },
  bookingBookNow: { de: 'Jetzt buchen', en: 'Book now' },
  bookingConfirmed: { de: 'Termin bestätigt! 🎉', en: 'Appointment confirmed! 🎉' },
  bookingNumber: { de: 'Buchungsnummer', en: 'Booking number' },
  bookingWhatsNext: { de: 'WAS KOMMT ALS NÄCHSTES?', en: "WHAT'S NEXT?" },
  bookingConfirmEmail: { de: 'Bestätigung per E-Mail', en: 'Confirmation by email' },
  bookingConfirmSoon: { de: 'Sofort', en: 'Immediately' },
  bookingProviderConfirms: { de: 'Anbieter bestätigt deinen Termin', en: 'Provider confirms your appointment' },
  bookingReminder: { de: 'Erinnerung 24h vor dem Termin', en: 'Reminder 24h before appointment' },
  bookingAutomatic: { de: 'Automatisch', en: 'Automatic' },
  bookingSendMessage: { de: 'Nachricht senden', en: 'Send message' },
  bookingServicePrice: { de: 'Service-Preis', en: 'Service price' },
  bookingPlatformFee: { de: 'Plattform-Gebühr', en: 'Platform fee' },
  bookingYourPayout: { de: 'Deine Auszahlung', en: 'Your payout' },
  bookingPaymentOnSite: { de: 'Zahlung bei Abschluss', en: 'Payment on completion' },
  bookingAtLeastOne: { de: 'Mind. 1 Service erforderlich', en: 'At least 1 service required' },
  bookingNoServices: { de: 'Gegenwärtig werden keine Services angeboten.', en: 'No services are currently offered.' },
  bookingInvalidSlot: {
    de: 'Dieser Termin ist leider nicht möglich. Bitte wähle ein anderes Datum oder Uhrzeit.',
    en: 'This appointment is not possible. Please choose another date or time.',
  },
  bookingSlotTaken: {
    de: 'Dieser Zeitslot ist bereits vergeben. Bitte wähle eine andere Zeit.',
    en: 'This time slot is already taken. Please choose another time.',
  },

  appointmentsTitle: { de: 'Meine Termine', en: 'My appointments' },
  appointmentsUpcoming: { de: 'Anstehend', en: 'Upcoming' },
  appointmentsCompleted: { de: 'Abgeschlossen', en: 'Completed' },
  appointmentsCancelled: { de: 'Abgesagt', en: 'Cancelled' },
  appointmentsEmpty: { de: 'Keine anstehenden Termine', en: 'No upcoming appointments' },
  appointmentsRoute: { de: 'Route', en: 'Route' },
  appointmentsDetail: { de: 'Termindetails', en: 'Appointment details' },
  appointmentsDuration: { de: 'Dauer', en: 'Duration' },
  appointmentsDate: { de: 'Datum & Zeit', en: 'Date & Time' },
  appointmentsTotalPrice: { de: 'Gesamtpreis', en: 'Total price' },
  appointmentsCancelPolicy: { de: 'Stornierungsrichtlinie', en: 'Cancellation policy' },
  appointmentsReschedule: { de: 'Termin verschieben', en: 'Reschedule appointment' },
  appointmentsCancel: { de: 'Termin stornieren', en: 'Cancel appointment' },
  appointmentsWriteReview: { de: 'Bewertung schreiben', en: 'Write a review' },
  appointmentsCall: { de: 'Anrufen', en: 'Call' },
  appointmentsBooked: { de: 'Gebucht', en: 'Booked' },
  appointmentsStatusTimeline: { de: 'Status', en: 'Status' },
  appointmentsHours: { de: 'Std.', en: 'hr' },
  appointmentsMinutes: { de: 'Min.', en: 'min' },
  appointmentsNotFound: { de: 'Termin nicht gefunden', en: 'Appointment not found' },
  appointmentsRetry: { de: 'Erneut versuchen', en: 'Try again' },

  statusPending: { de: 'Ausstehend', en: 'Pending' },
  statusConfirmed: { de: 'Bestätigt', en: 'Confirmed' },
  statusInProgress: { de: 'In Bearbeitung', en: 'In progress' },
  statusCompleted: { de: 'Abgeschlossen', en: 'Completed' },
  statusCancelled: { de: 'Storniert', en: 'Cancelled' },

  cancelTitle: { de: 'Termin stornieren', en: 'Cancel appointment' },
  cancelConfirmTitle: { de: 'Termin wirklich stornieren?', en: 'Cancel this appointment?' },
  cancelConfirmBody: {
    de: 'Möchtest du diesen Termin wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.',
    en: 'Do you really want to cancel this appointment? This action cannot be undone.',
  },
  cancelPolicy: { de: 'Stornierungsrichtlinie', en: 'Cancellation policy' },
  cancelPolicyText: {
    de: 'Kostenlose Stornierung bis 24 Stunden vor Termin möglich. Bei kurzfristigerer Stornierung kann eine Gebühr von 50% anfallen.',
    en: 'Free cancellation up to 24 hours before the appointment. A 50% fee may apply for late cancellations.',
  },
  cancelPolicyUrgent: {
    de: 'Kurzfristige Stornierung (weniger als 24h). Eine Gebühr von 50% des Servicepreises kann anfallen.',
    en: 'Late cancellation (less than 24h). A fee of 50% of the service price may apply.',
  },
  cancelReason: { de: 'Grund für Stornierung', en: 'Reason for cancellation' },
  cancelReasonOther: { de: 'Andere Pläne', en: 'Other plans' },
  cancelReasonSick: { de: 'Gesundheitliche Gründe', en: 'Health reasons' },
  cancelReasonEmergency: { de: 'Notfall', en: 'Emergency' },
  cancelReasonProvider: { de: 'Möchte einen anderen Anbieter', en: 'Want a different provider' },
  cancelReasonMisc: { de: 'Sonstiges', en: 'Other' },
  cancelConfirmBtn: { de: 'Termin stornieren', en: 'Cancel appointment' },
  cancelNotes: { de: 'Zusätzliche Anmerkungen (optional)', en: 'Additional notes (optional)' },
  cancelNotesPlaceholder: { de: 'Möchtest du noch etwas hinzufügen?', en: 'Would you like to add anything?' },
  cancelProviderNotified: { de: 'Der Anbieter wird über die Stornierung informiert', en: 'The provider will be notified of the cancellation' },
  cancelNotAllowed: { de: 'Dieser Termin kann nicht mehr storniert werden.', en: 'This appointment can no longer be cancelled.' },

  rescheduleTitle: { de: 'Termin verschieben', en: 'Reschedule appointment' },
  rescheduleCurrentBooking: { de: 'Dein aktueller Termin', en: 'Your current appointment' },
  rescheduleNewDate: { de: 'Neues Datum', en: 'New date' },
  rescheduleReason: { de: 'Grund für Verschiebung (optional)', en: 'Reason for rescheduling (optional)' },
  rescheduleConfirm: { de: 'Termin verschieben', en: 'Reschedule' },

  reviewsTitle: { de: 'Bewertungen', en: 'Reviews' },
  reviewWrite: { de: 'Bewertung schreiben', en: 'Write review' },
  reviewQuestion: { de: 'Wie war dein Erlebnis?', en: 'How was your experience?' },
  reviewPlaceholder: { de: 'Teile deine Erfahrung...', en: 'Share your experience...' },
  reviewSubmit: { de: 'Bewertung senden', en: 'Submit review' },
  reviewReply: { de: 'Antworten', en: 'Reply' },
  reviewResponse: { de: 'Deine Antwort', en: 'Your reply' },
  reviewResponseSend: { de: 'Antwort senden', en: 'Send reply' },
  reviewNoReviews: { de: 'Noch keine Bewertungen', en: 'No reviews yet' },
  reviewUnread: { de: 'Unbeantwortet', en: 'Unanswered' },
  reviewBased: { de: 'Basierend auf', en: 'Based on' },
  reviewEditResponse: { de: 'Bearbeiten', en: 'Edit' },

  chatTitle: { de: 'Nachrichten', en: 'Messages' },
  chatEmpty: { de: 'Noch keine Nachrichten', en: 'No messages yet' },
  chatEmptySub: { de: 'Starte ein Gespräch über deine Buchungen', en: 'Start a conversation about your bookings' },
  chatNoMessages: { de: 'Noch keine Nachrichten', en: 'No messages yet' },
  chatFirstMessage: { de: 'Sende die erste Nachricht', en: 'Send the first message' },
  chatPlaceholder: { de: 'Nachricht schreiben...', en: 'Write a message...' },
  chatOnline: { de: 'Online', en: 'Online' },
  chatOffline: { de: 'Offline', en: 'Offline' },
  chatTyping: { de: 'schreibt ...', en: 'typing ...' },
  chatSend: { de: 'Senden', en: 'Send' },

  notificationsTitle: { de: 'Benachrichtigungen', en: 'Notifications' },
  notificationsMarkAll: { de: 'Alle lesen', en: 'Mark all read' },
  notificationsEmpty: { de: 'Keine Benachrichtigungen', en: 'No notifications' },
  notificationsEmptySub: { de: 'Hier siehst du Updates zu deinen Buchungen', en: 'You will see updates about your bookings here' },
  notificationsToday: { de: 'Heute', en: 'Today' },
  notificationsYesterday: { de: 'Gestern', en: 'Yesterday' },

  settingsTitle: { de: 'Einstellungen', en: 'Settings' },
  settingsAccount: { de: 'Account', en: 'Account' },
  settingsPersonalInfo: { de: 'Persönliche Informationen', en: 'Personal information' },
  settingsPassword: { de: 'Passwort ändern', en: 'Change password' },
  settingsNotifications: { de: 'Benachrichtigungen', en: 'Notifications' },
  settingsLegal: { de: 'Sicherheit & Rechtliches', en: 'Security & Legal' },
  settingsPrivacy: { de: 'Datenschutzerklärung', en: 'Privacy policy' },
  settingsTerms: { de: 'Nutzungsbedingungen', en: 'Terms of use' },
  settingsImprint: { de: 'Impressum', en: 'Imprint' },
  settingsLanguage: { de: 'Sprache', en: 'Language' },
  settingsLanguageDe: { de: 'Deutsch', en: 'Deutsch' },
  settingsLanguageEn: { de: 'English', en: 'English' },
  settingsLogout: { de: 'Abmelden', en: 'Sign out' },
  settingsDeleteAccount: { de: 'Account löschen', en: 'Delete account' },
  settingsDeleteTitle: { de: 'Möchtest du deinen Account wirklich löschen?', en: 'Do you really want to delete your account?' },
  settingsDeleteBody: {
    de: 'Alle deine Daten, Bewertungen und der Verlauf werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
    en: 'All your data, reviews and history will be permanently deleted. This action cannot be undone.',
  },
  settingsDeleteEnterPassword: { de: 'Gib dein Passwort ein', en: 'Enter your password' },
  settingsDeletePasswordBody: { de: 'Bitte bestätige die Löschung mit deinem aktuellen Passwort.', en: 'Please confirm deletion with your current password.' },
  settingsDeleteFinal: { de: 'Endgültig löschen', en: 'Delete permanently' },
  settingsLogoutConfirm: { de: 'Wirklich abmelden?', en: 'Really sign out?' },
  settingsLogoutBody: { de: 'Möchtest du dich wirklich ausloggen?', en: 'Do you really want to sign out?' },

  clientProfileTitle: { de: 'Profil', en: 'Profile' },
  clientProfileAddresses: { de: 'Meine Adressen', en: 'My addresses' },
  clientProfileSaved: { de: 'gespeichert', en: 'saved' },
  clientProfileReviews: { de: 'Meine Bewertungen', en: 'My reviews' },
  clientProfileHistory: { de: 'Buchungshistorie', en: 'Booking history' },
  clientProfileFavourites: { de: 'Meine Favoriten', en: 'My favourites' },
  clientProfileSwitchMode: { de: 'Mit anderem Anbieter-Konto anmelden', en: 'Sign in with a provider account' },
  clientProfileSwitchBody: {
    de: 'Du wirst abgemeldet und kannst dich danach mit einem separaten Anbieter-Konto anmelden.',
    en: 'You will be signed out and can then sign in with a separate provider account.',
  },
  emailVerified: { de: 'E-Mail verifiziert', en: 'Email verified' },
  phoneVerified: { de: 'Telefon verifiziert', en: 'Phone verified' },

  favouritesTitle: { de: 'Meine Favoriten', en: 'My favourites' },
  favouritesEmpty: { de: 'Noch keine Favoriten', en: 'No favourites yet' },
  favouritesEmptySub: { de: 'Entdecke Braider in deiner Nähe', en: 'Discover braiders near you' },
  favouritesDiscover: { de: 'Braider entdecken', en: 'Discover braiders' },
  favouritesRemoveTitle: { de: 'Aus Favoriten entfernen?', en: 'Remove from favourites?' },

  dashboardWelcome: { de: 'Willkommen zurück', en: 'Welcome back' },
  dashboardAvailable: { de: 'Verfügbar', en: 'Available' },
  dashboardUnavailable: { de: 'Nicht verfügbar', en: 'Unavailable' },
  dashboardAvailableSub: { de: 'Kunden können dich jetzt buchen', en: 'Customers can book you now' },
  dashboardUnavailableSub: { de: 'Du nimmst keine Buchungen an', en: 'You are not accepting bookings' },
  dashboardTodayAppts: { de: "Heute's Termine", en: "Today's appointments" },
  dashboardRating: { de: 'Bewertung', en: 'Rating' },
  dashboardThisWeek: { de: 'Diese Woche', en: 'This week' },
  dashboardNextAppt: { de: 'Nächster Termin', en: 'Next appointment' },
  dashboardTodaySchedule: { de: 'Heutiger Zeitplan', en: "Today's schedule" },
  dashboardOpenCalendar: { de: 'Kalender öffnen', en: 'Open calendar' },
  dashboardQuickAccess: { de: 'Schnellzugriff', en: 'Quick access' },
  dashboardNoAppts: { de: 'Keine weiteren Termine heute', en: 'No more appointments today' },
  dashboardStart: { de: 'Starten', en: 'Start' },
  dashboardEarnings: { de: 'Gewinnpotenzial heute', en: 'Potential earnings today' },

  bookingRequestTitle: { de: 'Buchungsanfrage', en: 'Booking request' },
  bookingRequestAlert: { de: '⚡ Schnell antworten!', en: '⚡ Respond quickly!' },
  bookingRequestAlertSub: { de: 'Kunden warten auf deine Bestätigung', en: 'Customers are waiting for your confirmation' },
  bookingRequestClient: { de: 'Kunde', en: 'Customer' },
  bookingRequestAccept: { de: 'Annehmen', en: 'Accept' },
  bookingRequestDecline: { de: 'Ablehnen', en: 'Decline' },
  bookingRequestDeclineTitle: { de: 'Buchung ablehnen', en: 'Decline booking' },
  bookingRequestDeclineBody: { de: 'Möchtest du diese Buchung wirklich ablehnen?', en: 'Do you really want to decline this booking?' },
  bookingRequestPrevious: { de: 'Bisherige Buchungen', en: 'Previous bookings' },
  bookingRequestLocation: { de: 'Ort', en: 'Location' },
  bookingRequestStudio: { de: 'In deinem Studio', en: 'In your studio' },
  bookingRequestConfirmed: { de: '✓ Du hast diesen Termin bestätigt', en: '✓ You confirmed this appointment' },
  bookingRequestDeclined: { de: '✗ Abgelehnt', en: '✗ Declined' },

  apptStart: { de: 'Termin starten', en: 'Start appointment' },
  apptComplete: { de: 'Termin abschließen', en: 'Complete appointment' },
  apptAccept: { de: 'Buchung annehmen', en: 'Accept booking' },
  apptDecline: { de: 'Ablehnen', en: 'Decline' },
  apptClientNote: { de: 'Notiz des Kunden', en: "Customer's note" },
  apptInfo: { de: 'Termininfo', en: 'Appointment info' },

  calendarTitle: { de: 'Terminkalender', en: 'Calendar' },
  calendarToday: { de: 'Heute', en: 'Today' },
  calendarNoAppts: { de: 'Keine Termine für diesen Tag', en: 'No appointments for this day' },
  calendarBlocked: { de: 'Blockiert', en: 'Blocked' },
  calendarAllDay: { de: 'Ganztägig', en: 'All day' },

  servicesTitle: { de: 'Services & Preise', en: 'Services & Prices' },
  servicesAdd: { de: 'Service hinzufügen', en: 'Add service' },
  servicesEdit: { de: 'Service bearbeiten', en: 'Edit service' },
  servicesInactive: { de: 'Inaktiv', en: 'Inactive' },
  servicesDeleteTitle: { de: 'Service löschen', en: 'Delete service' },
  servicesDeleteBody: { de: 'Möchtest du diesen Service wirklich unwiderruflich löschen?', en: 'Do you really want to permanently delete this service?' },
  servicesEmpty: { de: 'Noch keine Services hinzugefügt', en: 'No services added yet' },
  servicesPricePrefix: { de: 'Ab ', en: 'From ' },

  timeSuffix: { de: ' Uhr', en: '' },

  favouritesRemoveBody: { de: 'Möchtest du {name} wirklich aus deinen Favoriten entfernen?', en: 'Do you really want to remove {name} from your favourites?' },
  remove: { de: 'Entfernen', en: 'Remove' },
  selectedServicesGeneric: { de: 'Gewählte Services', en: 'Selected services' },
  bookedServices: { de: 'Gebuchte Services', en: 'Booked services' },
  approxDuration: { de: 'Ca. 2-3 Stunden', en: 'Approx. 2–3 hours' },
  providerGeneric: { de: 'Anbieter', en: 'Provider' },
  cardGeneralTag: { de: 'Allgemein', en: 'General' },
  newLabel: { de: 'NEU', en: 'NEW' },
  responseTimeDefault: { de: '< 1 Stunde', en: '< 1 hour' },
  cancellationDefault: { de: '24 Stunden vor dem Termin', en: '24 hours before the appointment' },
  freeCancellationUntil: { de: 'Kostenlose Stornierung bis', en: 'Free cancellation until' },
  bookingWithinHour: { de: 'Innerhalb von 1 Stunde', en: 'Within 1 hour' },
  appointmentsEmptyCompleted: { de: 'Noch keine abgeschlossenen Termine', en: 'No completed appointments yet' },
  appointmentsEmptyCancelled: { de: 'Keine abgesagten Termine', en: 'No cancelled appointments' },
  appointmentsInfo: { de: 'Termininfo', en: 'Appointment info' },
  dashboardLoadError: { de: 'Fehler beim Laden der Daten.', en: 'Error loading data.' },
  blockTimeNoReason: { de: 'Kein Grund angegeben', en: 'No reason provided' },
  servicesOtherCategory: { de: 'Sonstige', en: 'Other' },
  chatConnectionLost: { de: 'Verbindung unterbrochen. Versuche es erneut.', en: 'Connection lost. Trying again.' },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS;
export type Lang = 'de' | 'en';

// ─── Context ──────────────────────────────────────────────────────────────────
interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'de',
  setLang: () => {},
  t: (key) => TRANSLATIONS[key].de,
});

const STORAGE_KEY = 'hc_language';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'de') {
        setLangState(stored);
      }
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return TRANSLATIONS[key][lang];
    },
    [lang],
  );

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLanguage() {
  return useContext(LanguageContext);
}
