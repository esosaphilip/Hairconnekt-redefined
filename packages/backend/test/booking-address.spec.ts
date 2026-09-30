import { validateSync } from 'class-validator';
import { CreateBookingDto } from '../src/bookings/dto/create-booking.dto';
import { Booking } from '../src/entities/booking.entity';

describe('BUG-033: Mobile Booking Address Contract & Serialization', () => {
  describe('CreateBookingDto Validation', () => {
    const validBasePayload = {
      providerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      serviceIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
      scheduledDate: '2026-11-20',
      scheduledTime: '14:00',
    };

    it('rejects mobile booking when addressId is omitted', () => {
      const dto = new CreateBookingDto();
      Object.assign(dto, validBasePayload, { isMobile: true });

      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      const addressError = errors.find((e) => e.property === 'addressId');
      expect(addressError).toBeDefined();
      expect(addressError?.constraints?.isNotEmpty).toBe('addressId ist erforderlich für mobile Buchungen.');
    });

    it('rejects mobile booking when addressId is empty string', () => {
      const dto = new CreateBookingDto();
      Object.assign(dto, validBasePayload, { isMobile: true, addressId: '' });

      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      const addressError = errors.find((e) => e.property === 'addressId');
      expect(addressError).toBeDefined();
    });

    it('rejects mobile booking when addressId is not a valid UUID', () => {
      const dto = new CreateBookingDto();
      Object.assign(dto, validBasePayload, { isMobile: true, addressId: 'not-a-valid-uuid' });

      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      const addressError = errors.find((e) => e.property === 'addressId');
      expect(addressError).toBeDefined();
      expect(addressError?.constraints?.isUuid).toBe('addressId muss eine gültige UUID sein.');
    });

    it('accepts mobile booking when addressId is a valid UUID', () => {
      const dto = new CreateBookingDto();
      Object.assign(dto, validBasePayload, {
        isMobile: true,
        addressId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      });

      const errors = validateSync(dto);
      expect(errors.length).toBe(0);
    });

    it('accepts non-mobile studio booking with no addressId', () => {
      const dto = new CreateBookingDto();
      Object.assign(dto, validBasePayload, { isMobile: false });

      const errors = validateSync(dto);
      expect(errors.length).toBe(0);
    });

    it('accepts non-mobile studio booking when addressId is undefined', () => {
      const dto = new CreateBookingDto();
      Object.assign(dto, validBasePayload, { isMobile: false, addressId: undefined });

      const errors = validateSync(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Booking Entity Address Snapshot & toJSON Serialization', () => {
    it('populates nested address object when snapshot columns are present', () => {
      const booking = new Booking();
      booking.addressStreet = 'Königsallee';
      booking.addressHouseNumber = '42';
      booking.addressPostalCode = '40212';
      booking.addressCity = 'Düsseldorf';

      booking.populateAddress();

      expect(booking.address).toEqual({
        street: 'Königsallee',
        houseNumber: '42',
        postalCode: '40212',
        city: 'Düsseldorf',
      });

      const serialized = JSON.parse(JSON.stringify(booking));
      expect(serialized.address).toEqual({
        street: 'Königsallee',
        houseNumber: '42',
        postalCode: '40212',
        city: 'Düsseldorf',
      });
    });

    it('sets address to null when snapshot columns are absent', () => {
      const booking = new Booking();

      booking.populateAddress();

      expect(booking.address).toBeNull();

      const serialized = JSON.parse(JSON.stringify(booking));
      expect(serialized.address).toBeNull();
    });
  });
});
