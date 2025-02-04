// @flow
import * as React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { renderFormat, serializeFormat } from '../util/worksheet_utils';
import { updateEditableField } from '../util/apiWrapper';

const KEYCODE_ESC = 27;

function isAscii(str) {
    return /^[\x20-\x7F]*$/.test(str);
}

class EditableFieldBase extends React.Component<{
    value: string,
    buildPayload: (string) => {},
    method: string,
    url: string,
    canEdit?: boolean,
    onChange?: () => void,
}> {
    /** Prop default values. */
    static defaultProps = {
        method: 'POST',
        canEdit: false,
    };

    constructor(props) {
        super(props);
        this.state = {
            editing: false,
            value: this.props.value,
            initValue: this.props.value,
            isValid: true,
        };
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.value !== prevState.initValue) {
            return { value: nextProps.value, initValue: nextProps.value };
        } else return null;
    }

    onClick = () => {
        this.setState({ editing: true });
    };

    onBlur = (event) => {
        if (!this.state.isValid) {
            event.preventDefault();
            return false;
        }

        this.setState({ editing: false });
        event.preventDefault();
        const { url, onChange, buildPayload } = this.props;
        const { value } = this.state;
        updateEditableField(url, buildPayload(value))
            .then(() => {
                if (onChange) {
                    onChange(this.state.value);
                }
            })
            .catch((error) => {
                if (this.props.onError) this.props.onError('Invalid value entered: ' + error);
                // Restore the original value
                this.setState({
                    value: this.props.value,
                });
            });
    };

    handleKeyPress = (event) => {
        if (event.keyCode === KEYCODE_ESC) {
            this.setState({ editing: false, value: this.state.initValue });
        }
    };

    handleAsciiChange = (event) => {
        // only ascii
        this.setState({ value: event.target.value, isValid: isAscii(event.target.value) });
    };

    handleFreeChange = (event) => {
        // allows non-ascii
        this.setState({ value: event.target.value });
    };

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.value !== this.props.value ||
            nextState.value !== this.state.value ||
            nextProps.canEdit !== this.props.canEdit ||
            this.state.editing !== nextState.editing
        );
    }

    render() {
        if (!this.props.canEdit) {
            return <span style={{ color: '#225ea8' }}>{this.state.value || '<none>'}</span>;
        }
        if (!this.state.editing) {
            return (
                <span
                    className='editable-field'
                    onClick={this.onClick}
                    style={{ color: '#225ea8' }}
                >
                    {this.state.value || '<none>'}
                </span>
            );
        } else {
            return (
                <form onSubmit={this.onBlur}>
                    <input
                        type='text'
                        autoFocus
                        value={this.state.value}
                        onBlur={this.onBlur}
                        onChange={
                            this.props.allowASCII ? this.handleFreeChange : this.handleAsciiChange
                        }
                        onKeyDown={this.handleKeyPress}
                        placeholder={this.props.placeholder}
                        maxLength='259'
                        style={{
                            textOverflow: 'ellipsis',
                            whiteSpace: 'pre',
                            maxWidth: '100%',
                            minWidth: '65px',
                            padding: '0 4px 0 3px',
                            color: '#225ea8',
                        }}
                    />
                    {!this.state.isValid && (
                        <div style={{ color: '#a94442' }}>Only ASCII characters allowed.</div>
                    )}
                </form>
            );
        }
    }
}

const efStyles = (theme) => ({
    editableLinkContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    editableLink: {
        textDecoration: 'none',
        color: theme.color.primary.dark,
        '&:hover': {
            color: theme.color.primary.base,
        },
    },
});

export const EditableField = withStyles(efStyles)(EditableFieldBase);

export class WorksheetEditableField extends React.Component<{
    uuid: string,
    fieldName: string,
    dataType: string,
}> {
    buildPayload(value) {
        return {
            data: [
                {
                    id: this.props.uuid,
                    type: 'worksheets',
                    attributes: {
                        [this.props.fieldName]: serializeFormat(value, this.props.dataType),
                    },
                },
            ],
        };
    }

    render() {
        return (
            <EditableField
                {...this.props}
                url='/rest/worksheets'
                method='PATCH'
                buildPayload={(value) => this.buildPayload(value)}
            />
        );
    }
}

WorksheetEditableField.defaultProps = {
    allowASCII: false,
    dataType: 'string',
};

export class BundleEditableField extends React.Component<{
    value: any,
    uuid: string,
    fieldName: string,
    dataType: string,
}> {
    /** Prop default values. */
    static defaultProps = {
        dataType: 'string',
    };

    buildPayload(value) {
        return {
            data: [
                {
                    id: this.props.uuid,
                    type: 'bundles',
                    attributes: {
                        metadata: {
                            [this.props.fieldName]: serializeFormat(value, this.props.dataType),
                        },
                    },
                },
            ],
        };
    }
    render() {
        return (
            <EditableField
                {...this.props}
                value={renderFormat(this.props.value, this.props.dataType)}
                url='/rest/bundles'
                method='PATCH'
                buildPayload={(value) => this.buildPayload(value)}
            />
        );
    }
}
