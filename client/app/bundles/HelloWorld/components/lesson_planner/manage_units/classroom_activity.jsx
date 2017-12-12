import React from 'react';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import activityFromClassificationId from '../../modules/activity_from_classification_id.js';

import PreviewOrLaunchModal from '../../shared/preview_or_launch_modal';

const styles = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  endRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '220px',
  },
  lessonEndRow: {
    display: 'flex',
    width: '100%',
    maxWidth: '385px',
    justifyContent: 'flex-dend',
    alignItems: 'center',
  },
  reportEndRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '150px',
    marginRight: '15px',
  },
};

export default React.createClass({

  getInitialState() {
    return {
      startDate: this.dueDate() ? moment(this.dueDate()) : undefined,
      showModal: false,
      showCustomizeTooltip: false,
      showLessonPlanTooltip: false
    };
  },

  hideClassroomActivity() {
    const x = confirm('Are you sure you want to delete this assignment?');
    if (x) {
      this.props.hideClassroomActivity(this.caId(), this.unitId());
    }
  },

  handleChange(date) {
    this.setState({ startDate: date, });
    this.props.updateDueDate(this.caId(), date.format());
  },

  toggleCustomizeTooltip() {
    this.setState({showCustomizeTooltip: !this.state.showCustomizeTooltip})
  },

  toggleLessonPlanTooltip() {
    this.setState({showLessonPlanTooltip: !this.state.showLessonPlanTooltip})
  },


  renderCustomizedEditionsTag() {
    if (window.location.pathname.includes('lessons')) {
      if (this.props.data.hasEditions) {
        return <div className="customized-editions-tag">Customized</div>
      }
    }
  },

  renderCustomizeTooltip() {
  if (this.state.showCustomizeTooltip) {
    return <div className="customize-tooltip">
      <i className="fa fa-caret-up"/>
      Customize
    </div>
  }
},

renderLessonPlanTooltip() {
  if (this.state.showLessonPlanTooltip) {
    return <div className="lesson-plan-tooltip">
      <i className="fa fa-caret-up"/>
      Download Lesson Plan
    </div>
  }
},

  goToRecommendations() {
    const link = `/teachers/progress_reports/diagnostic_reports#/u/${this.unitId()}/a/${this.activityId()}/c/${this.classroomId()}/recommendations`;
    window.location = link;
  },

  buttonForRecommendations() {
    const diagnosticIds = [413, 447, 602];
    if (diagnosticIds.includes(this.activityId()) && window.location.pathname.includes('diagnostic_reports')) {
      return (
        <div onClick={this.goToRecommendations} className="recommendations-button">
					Recommendations
				</div>
      );
    }
  },

  renderLessonsAction() {
    if (window.location.pathname.includes('lessons')) {
      if (this.props.data.completed) {
        return <p className="lesson-completed"><i className="fa fa-icon fa-check-circle" />Lesson Complete</p>;
      } else if (this.props.data.started) {
        return <a className="mark-completed" target="_blank" href={`/teachers/classroom_activities/${this.props.data.caId}/mark_lesson_as_completed/${this.activityId()}`}>Mark As Complete</a>
      } else if (this.props.data.supportingInfo) {
        return <a className="supporting-info" target="_blank" href={`/activities/${this.activityId()}/supporting_info`}><i className="fa fa-file-pdf-o"/>Download Lesson Plan</a>
      }
    }
  },

  lessonFinalCell() {
  return <div className="lessons-end-row">
    {this.lessonCompletedOrLaunch()}
    <a
      className="customize-lesson"
      href={`/customize/${this.props.data.activityUid}`}
      onMouseEnter={this.toggleCustomizeTooltip}
      onMouseLeave={this.toggleCustomizeTooltip}
    >
      <i className="fa fa-icon fa-magic"/>
      {this.renderCustomizeTooltip()}
    </a>
    <a
      className="supporting-info"
      target="_blank"
      href={`/activities/${this.activityId()}/supporting_info`}
      onMouseEnter={this.toggleLessonPlanTooltip}
      onMouseLeave={this.toggleLessonPlanTooltip}
    >
      <img src="https://assets.quill.org/images/icons/download-lesson-plan-green-icon.svg"/>
      {this.renderLessonPlanTooltip()}
    </a>
  </div>
},

  urlForReport() {
    $.get(`/teachers/progress_reports/report_from_unit_and_activity/u/${this.unitId()}/a/${this.activityId()}`)
      .success((data) => window.location = data.url)
      .fail(() => alert('This report is not yet available. Please check back when at least one of your students has completed this activity.'));
  },

  anonymousPath() {
    return `${process.env.DEFAULT_URL}/activity_sessions/anonymous?activity_id=${this.activityId()}`;
  },

  finalCell() {
    const startDate = this.state.startDate;
    if (this.props.report) {
      return [<a key="this.props.data.activity.anonymous_path" href={this.anonymousPath()} target="_blank">Preview</a>, <a key={`report-url-${this.caId()}`} onClick={this.urlForReport}>View Report</a>];
    } else if (this.isLesson()) {
       return this.lessonFinalCell();
    }
    if (this.props.data.ownedByCurrentUser) {
      return <DatePicker className="due-date-input" onChange={this.handleChange} selected={startDate} placeholderText={startDate ? startDate.format('l') : 'Optional'} />;
    } else {
      return startDate ? <div className='due-date-input'>{startDate.format('l')}</div> : null;
    }

  },

  caId() {
    return this.props.data.caId || this.props.data.id;
  },

  unitId() {
    return this.props.unitId || this.props.data.unit_id;
  },

  dueDate() {
    return this.props.data.due_date || this.props.data.dueDate;
  },

  activityId() {
    return this.props.data.activityId || this.props.data.activityUid || this.props.data.activity.uid;
  },

  activityName() {
    return this.props.data.name || this.props.data.activity.name;
  },

  classification() {
    return this.props.data.activityClassificationId;
  },

  classroomId() {
    return this.props.data.classroomId || this.props.data.classroom_id;
  },

  icon() {
    const classification = this.classification();
    if (classification) {
      // then we're coming from the index and have an id
      return `icon-${activityFromClassificationId(classification)}-green`;
    }
    // it is stupid that we are passing this in some of this components use create_activity_sessions
    //  but don't have time to deprecate it right now
    return this.props.data.activity.classification.green_image_class;
  },

  lessonCompletedOrLaunch() {
    if (this.props.data.completed) {
      return <a className="report-link" target="_blank" href={`/teachers/progress_reports/report_from_classroom_activity/${this.props.data.caId}`}>View Report</a>
    }
    if (this.props.data.studentCount === 0) {
      return <a onClick={this.noStudentsWarning} id="launch-lesson">{this.props.data.started ? 'Resume Lesson' : 'Launch Lesson'}</a>;
    } else {
      if (this.props.data.started) {
        return <a href={`${process.env.DEFAULT_URL}/teachers/classroom_activities/${this.caId()}/launch_lesson/${this.activityId()}`} className="resume-lesson">Resume Lesson</a>;
      } else {
        return <a href={`${process.env.DEFAULT_URL}/teachers/classroom_activities/${this.caId()}/launch_lesson/${this.activityId()}`} id="launch-lesson">Launch Lesson</a>;
      }
    }
  },

  noStudentsWarning() {
    if (window.confirm("You have no students in this class. Quill Lessons is a collaborative tool for teachers and students to work together. If you'd like to launch this lesson anyway, click OK below. Otherwise, click Cancel.")) {
      window.location.href = `${process.env.DEFAULT_URL}/teachers/classroom_activities/${this.caId()}/launch_lesson/${this.activityId()}`
    }
  },

  isLesson() {
    return this.props.lesson || this.classification() === 6;
  },

  deleteRow() {
    if (!this.props.report && !(this.isLesson())) {
      const style = !this.props.data.ownedByCurrentUser ? {visibility: 'hidden'} : null;
      return <div className="pull-right" style={style}><img className="delete-classroom-activity h-pointer" onClick={this.hideClassroomActivity} src="/images/x.svg" /></div>;
    }
  },

  openModal() {
    this.setState({ showModal: true, });
  },

  closeModal() {
    this.setState({ showModal: false, });
  },

  renderModal() {
    if (this.state.showModal) {
      return (<PreviewOrLaunchModal
        lessonID={this.activityId()}
        classroomActivityID={this.caId()}
        closeModal={this.closeModal}
        completed={this.props.data.completed}
      />);
    }
  },

  render() {
    let link,
      endRow;
    if (this.props.report) {
      link = <a onClick={this.urlForReport} target="_new">{this.activityName()}</a>;
      endRow = styles.reportEndRow;
    } else if (this.isLesson()) {
      link = <span onClick={this.openModal}>{this.activityName()}</span>;
      endRow = styles.lessonEndRow;
    } else {
      link = <a href={this.anonymousPath()} target="_new">{this.activityName()}</a>;
      endRow = styles.endRow;
    }
    return (
      <div className="row" style={styles.row}>
        {this.renderModal()}
        <div className="starting-row">
          <div className="cell">
            <div className={`pull-left icon-wrapper ${this.icon()}`} />
          </div>
          <div className="cell" id="activity-analysis-activity-name">
            {link}
            {this.renderCustomizedEditionsTag()}
            {this.buttonForRecommendations()}
          </div>
        </div>
        <div className="cell" style={endRow}>
          {this.renderLessonsAction()}
          {this.finalCell()}
          {this.deleteRow()}
        </div>
      </div>
    );
  },
});
