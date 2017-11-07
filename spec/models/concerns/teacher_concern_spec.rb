require 'rails_helper'

describe User, type: :model do
  describe 'teacher concern' do
    let!(:teacher) { create(:teacher, :with_classrooms_students_and_activities) }
    let!(:classroom) { teacher.classrooms_i_teach.first }
    let!(:classroom1) { teacher.classrooms_i_teach.second }

    it '#classrooms_i_teach_with_students' do
      classroom_hash = classroom.attributes
      classroom_hash[:students] = classroom.students
      classroom1_hash = classroom1.attributes
      classroom1_hash[:students] = classroom1.students
      classrooms = teacher.classrooms_i_teach_with_students
      # HACK: let's disregard the created_at and updated_at values
      # to avoid a bunch of nasty temporal comparison issues...
      classroom_hash['created_at'] = nil
      classroom_hash['updated_at'] = nil
      classroom1_hash['created_at'] = nil
      classroom1_hash['updated_at'] = nil
      classrooms[0]['created_at'] = nil
      classrooms[0]['updated_at'] = nil
      classrooms[1]['created_at'] = nil
      classrooms[1]['updated_at'] = nil

      expect(classrooms).to include(classroom_hash)
      expect(classrooms).to include(classroom1_hash)
    end

    describe '#archived_classrooms' do
      it "returns an array of teachers archived classes if extant" do
        classroom.update(visible: false)
        expect(teacher.archived_classrooms).to eq([classroom])
      end

      it "returns an empty ActiveRecord association if the teacher has no archived classes" do
        expect(teacher.archived_classrooms.empty?).to be true
      end
    end

    describe '#is_premium?' do
      let!(:teacher_premium_test) {create(:teacher, :with_classrooms_students_and_activities)}
      let!(:classroom) {teacher_premium_test.classrooms_i_teach.first}

      context 'user has no associated subscription' do
        it 'returns false' do
          expect(teacher_premium_test.is_premium?).to be false
        end
      end

      context 'user has an associated subscription' do
        context 'that has expired' do
          # for some reason Rspec was setting expiration as today if I set it at Date.yesterday, so had to minus 1 from yesterday
          let!(:subscription) {create(:subscription, account_limit: 1, expiration: Date.yesterday-1, account_type: 'Teacher Paid')}
          let!(:user_subscription) {create(:user_subscription, user_id: teacher.id, subscription: subscription)}
          it 'returns false' do
            expect(teacher_premium_test.is_premium?).to be false
          end
        end

        context 'that has not expired' do
          let!(:subscription) {create(:subscription, account_limit: 1, expiration: Date.tomorrow, account_type: 'Teacher Trial')}
          let!(:user_subscription) {create(:user_subscription, user_id: teacher_premium_test.id, subscription: subscription)}
          let!(:student1) {create(:user, role: 'student', classrooms: [classroom])}
          context 'that has passed its account limit' do
            let!(:student2) {create(:user, role: 'student', classrooms: [classroom])}
            it 'returns false' do
              expect(teacher.is_premium?).to be false
            end
          end

          context 'that has not passed its account limit' do
            it 'returns true' do
              expect(teacher_premium_test.is_premium?).to be true
            end
          end
        end
      end
    end

    describe '#updated_school' do
      let!(:queens_teacher_2) { create(:teacher) }
      let!(:queens_subscription) {create(:subscription)}
      let!(:queens_school) { create :school, name: "Queens Charter School", zipcode: '11385'}
      let!(:queens_school_sub) {create(:school_subscription, subscription_id: queens_subscription.id, school_id: queens_school.id)}
      let!(:brooklyn_school) { create :school, name: "Brooklyn Charter School", zipcode: '11237'}
      let!(:school_with_no_subscription) { create :school, name: "Staten Island School", zipcode: '10000'}
      let!(:queens_teacher) { create(:teacher) }
      let!(:teacher_subscription) {create(:subscription)}
      let!(:user_subscription) {create(:user_subscription, user_id: queens_teacher.id, subscription_id: teacher_subscription.id)}
      let!(:subscription) {create(:subscription)}
      let!(:brooklyn_subscription) {create(:subscription)}
      let!(:brooklyn_school_sub) {create(:school_subscription, subscription_id: brooklyn_subscription.id, school_id: brooklyn_school.id)}
      let!(:queens_teacher_2_user_sub) {create(:user_subscription, user_id: queens_teacher_2.id, subscription_id: queens_subscription.id)}

      context "when the school has no subscription" do

        it 'does nothing to the teachers personal subscription' do
          expect(queens_teacher.subscription).to eq(teacher_subscription)
          queens_teacher.updated_school(queens_school)
          expect(queens_teacher.subscription).to eq(teacher_subscription)
        end

      end

      context "when the school has a subscription" do
        describe 'and the teacher has a subscription' do
          it "overwrites the teacher's if the teacher's is from a different school" do
            expect(queens_teacher_2.subscription).to eq(queens_subscription)
            queens_teacher_2.updated_school(brooklyn_school)
            expect(queens_teacher_2.reload.subscription).to eq(brooklyn_subscription)
          end


          context "that is their own subscription" do

            it "lets the teacher keep their subscription if it has a later expiration date" do
              teacher_subscription.update(expiration: Date.tomorrow)
              brooklyn_subscription.update(expiration: Date.yesterday)
              queens_teacher.updated_school(brooklyn_school)
              expect(queens_teacher.subscription).to eq(teacher_subscription)
            end

            it 'gives them the new school subscription if has a later expiration date' do
              teacher_subscription.update(expiration: Date.yesterday)
              brooklyn_subscription.update(expiration: Date.tomorrow)
              queens_teacher.updated_school(brooklyn_school)
              expect(queens_teacher.subscription).to eq(teacher_subscription)
            end

          end
        end

        describe 'and the user does not have a subscription' do
          it "the user gets the school subscription" do
            queens_teacher_2.user_subscription.destroy
            queens_teacher_2.updated_school(brooklyn_school)
            expect(queens_teacher_2.reload.subscription).to eq(brooklyn_school.subscription)
          end
        end
      end

    end
    describe '#premium_state' do
      let!(:teacher) {create(:user, role: 'teacher')}

      context 'user is on a valid trial' do
        let!(:trial_teacher) {create(:user, role: 'teacher')}
        let!(:subscription) {create(:subscription, account_limit: 1, expiration: Date.today + 1, account_type: 'Teacher Trial')}
        let!(:user_subscription) {create(:user_subscription, user_id: trial_teacher.id, subscription: subscription)}
        it "returns 'trial'" do
          expect(trial_teacher.premium_state).to eq('trial')
        end
      end

      context 'user is on a paid plan' do
        let!(:paid_teacher) {create(:user, role: 'teacher')}
        let!(:subscription) {create(:subscription, account_limit: 1, expiration: Date.today + 1, account_type: 'Teacher Paid')}
        let!(:user_subscription) {create(:user_subscription, user_id: paid_teacher.id, subscription: subscription)}
        it "returns 'paid'" do
          expect(paid_teacher.premium_state).to eq('paid')
        end
      end

      context 'users trial is expired' do
        let!(:subscription) {create(:subscription, account_limit: 1, expiration: Date.yesterday, account_type: 'Teacher Paid')}
          let!(:user_subscription) {create(:user_subscription, user_id: teacher.id, subscription: subscription)}
        it "returns 'locked'" do
          expect(teacher.premium_state).to eq('locked')
        end
      end

      context 'user has never had a subscription' do
        it "returns 'none'" do
          expect(teacher.premium_state).to eq('none')
        end
      end
    end
  end
end
